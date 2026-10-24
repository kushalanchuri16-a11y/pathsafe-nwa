// Offline diagnosis of one captured trip. Does not alter validation or request routes.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  lineWithinArea,
  withinPolygons,
  type Polygon,
} from "../lib/geocoding/area";
import { coordinateDistance, projector } from "../lib/analysis/geometry";
import type { Coordinate } from "../types/routes";
import { parseValhalla } from "../lib/routing/valhalla";

const fixture = JSON.parse(
  await readFile("data/reliability/creekside-osage-routing.json", "utf8"),
);
const boundaryText = await readFile("data/boundary/bentonville.json", "utf8");
const polygons: Polygon[] = JSON.parse(boundaryText).features.flatMap(
  (f: { geometry: { coordinates: Polygon[] } }) => f.geometry.coordinates,
);
const outer = polygons.map((p) => [p[0]]);
const edges = polygons.flatMap((p, polygon) =>
  p.flatMap((ring, ringIndex) =>
    ring.slice(1).map((end, index) => ({
      polygon,
      ring: ringIndex,
      start: ring[index],
      end,
    })),
  ),
);
const parsed = parseValhalla(fixture.raw, fixture.endpoint);
const alternatives = parsed.routes.map((route, alternative) => {
  const pieces: {
    segment: number;
    start: Coordinate;
    end: Coordinate;
    meters: number;
    cause: string;
    holes: string[];
    midpoint: Coordinate;
    depthMeters: number;
  }[] = [];
  for (let segment = 1; segment < route.geometry.length; segment++) {
    const [ay, ax] = route.geometry[segment - 1],
      [by, bx] = route.geometry[segment],
      dx = bx - ax,
      dy = by - ay;
    const ts = [0, 1];
    for (const {
      start: [cx, cy],
      end: [ex, ey],
    } of edges) {
      const sx = ex - cx,
        sy = ey - cy,
        den = dx * sy - dy * sx;
      if (Math.abs(den) < 1e-18) continue;
      const t = ((cx - ax) * sy - (cy - ay) * sx) / den,
        u = ((cx - ax) * dy - (cy - ay) * dx) / den;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
    }
    ts.sort((a, b) => a - b);
    for (let i = 1; i < ts.length; i++) {
      if (ts[i] === ts[i - 1]) continue;
      const t = (ts[i] + ts[i - 1]) / 2,
        midpoint: Coordinate = [ay + dy * t, ax + dx * t];
      if (withinPolygons(...midpoint, polygons)) continue;
      const start: Coordinate = [ay + dy * ts[i - 1], ax + dx * ts[i - 1]],
        end: Coordinate = [ay + dy * ts[i], ax + dx * ts[i]];
      const cause = withinPolygons(...midpoint, outer)
        ? "internal City Limits hole"
        : "true city exit";
      const holes = polygons.flatMap((p, pi) =>
        p
          .slice(1)
          .flatMap((ring, ri) =>
            withinPolygons(...midpoint, [[ring]]) ? [`${pi}:${ri + 1}`] : [],
          ),
      );
      const project = projector(midpoint);
      const depthMeters = Math.min(
        ...edges.map(({ start: [x, y], end: [xx, yy] }) => {
          const [a, b] = project([y, x]),
            [c, d] = project([yy, xx]),
            vx = c - a,
            vy = d - b;
          const u = Math.max(
            0,
            Math.min(1, -(a * vx + b * vy) / (vx * vx + vy * vy || 1)),
          );
          return Math.hypot(a + u * vx, b + u * vy);
        }),
      );
      pieces.push({
        segment,
        start,
        end,
        meters: coordinateDistance(start, end),
        cause,
        holes,
        midpoint,
        depthMeters,
      });
    }
  }
  const rawIndex = fixture.raw.routes.findIndex(
    (r: { geometry: { coordinates: number[][] } }) =>
      JSON.stringify(r.geometry.coordinates.map(([x, y]) => [y, x])) ===
      JSON.stringify(route.geometry),
  );
  const intervals: {
    start: Coordinate;
    end: Coordinate;
    meters: number;
    cause: string;
    holes: string[];
  }[] = [];
  for (const p of pieces) {
    const last = intervals.at(-1);
    if (
      last &&
      last.cause === p.cause &&
      coordinateDistance(last.end, p.start) < 0.000001
    ) {
      last.end = p.end;
      last.meters += p.meters;
      last.holes = [...new Set([...last.holes, ...p.holes])];
    } else
      intervals.push({
        start: p.start,
        end: p.end,
        meters: p.meters,
        cause: p.cause,
        holes: p.holes,
      });
  }
  const raw = fixture.raw.routes[rawIndex];
  return {
    alternative: alternative + 1,
    rawIndex,
    providerDistanceMeters: route.metrics.providerDistanceMeters,
    durationSeconds: route.metrics.seconds,
    passesBoundary: lineWithinArea(route.geometry),
    passesOuterBoundary: lineWithinArea(route.geometry, outer),
    outsideMeters: pieces.reduce((n, p) => n + p.meters, 0),
    trueExitMeters: pieces
      .filter((p) => p.cause === "true city exit")
      .reduce((n, p) => n + p.meters, 0),
    holeMeters: pieces
      .filter((p) => p.cause === "internal City Limits hole")
      .reduce((n, p) => n + p.meters, 0),
    endpointSnapsMeters: {
      start: coordinateDistance(fixture.start.point, route.geometry[0]),
      destination: coordinateDistance(
        fixture.destination.point,
        route.geometry.at(-1)!,
      ),
    },
    snappedEndpointsInside: {
      start: withinPolygons(...route.geometry[0], polygons),
      destination: withinPolygons(...route.geometry.at(-1)!, polygons),
    },
    maxObservedOutsideMidpointDepthMeters: Math.max(
      0,
      ...pieces.map((p) => p.depthMeters),
    ),
    rawParsedCoordinatesIdentical:
      JSON.stringify(route.geometry) ===
      JSON.stringify(
        raw.geometry.coordinates.map(([x, y]: number[]) => [y, x]),
      ),
    maximumCoordinateDecimalPlaces: Math.max(
      ...raw.geometry.coordinates
        .flat()
        .map((v: number) => String(v).split(".")[1]?.length ?? 0),
    ),
    intervals,
    pieces,
  };
});
const result = {
  checkedAt: new Date().toISOString(),
  routingFetchedAt: fixture.checkedAt,
  boundarySHA256: createHash("sha256").update(boundaryText).digest("hex"),
  boundarySource:
    "https://gis.bentonvillear.com/arcgis/rest/services/Planning/Pending_PZitems_Publish23/MapServer/5",
  start: fixture.start,
  destination: fixture.destination,
  liveBoundaryPointChecks: fixture.liveBoundaryPointChecks,
  rawReceived: fixture.raw.routes.length,
  distinctReceived: parsed.routes.length,
  valid: alternatives.filter((r) => r.passesBoundary).length,
  rejected: alternatives.filter((r) => !r.passesBoundary).length,
  measurement:
    "Partition the returned GeoJSON route segments at all intersections with the unchanged bundled City polygon rings. Classify every open subsegment by its midpoint against the full polygon union and exterior-only union; sum geodesic lengths with the application's Turf distance routine. Values are exact-to-returned-geometry calculations, not a physical survey. No buffer, simplification, rounding allowance or route-policy threshold is applied.",
  alternatives,
};
await writeFile(
  "data/reliability/creekside-osage-diagnosis.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      ...result,
      alternatives: alternatives.map(({ pieces, intervals, ...rest }) => ({
        ...rest,
        intervals,
      })),
    },
    null,
    2,
  ),
);
