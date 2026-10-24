import { readFile, writeFile } from "node:fs/promises";
import boundary from "../data/boundary/bentonville.json";
import { withinPolygons, type Polygon } from "../lib/geocoding/area";
import { coordinateDistance, projector } from "../lib/analysis/geometry";
import type { Coordinate } from "../types/routes";
const area: Polygon[] = boundary.features.flatMap(
  (f) => f.geometry.coordinates,
);
const raw = JSON.parse(
  await readFile(
    process.argv[2] ?? "data/reliability/reported-routing.json",
    "utf8",
  ),
);
const rows = [];
for (const route of raw.routing.result.routes) {
  const line = route.geometry as Coordinate[],
    outside: {
      from: Coordinate;
      to: Coordinate;
      meters: number;
      maxDepthMeters: number;
    }[] = [],
    project = projector(line[0]);
  const edges = area.flatMap((p) =>
    p.flatMap((r) =>
      r
        .slice(1)
        .map((b, i) => [project([r[i][1], r[i][0]]), project([b[1], b[0]])]),
    ),
  );
  function depth(point: Coordinate) {
    const [x, y] = project(point);
    let min = Infinity;
    for (const [[ax, ay], [bx, by]] of edges) {
      const dx = bx - ax,
        dy = by - ay,
        t = Math.max(
          0,
          Math.min(
            1,
            ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1),
          ),
        );
      min = Math.min(min, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
    return min;
  }
  let length = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1],
      b = line[i],
      [ay, ax] = a,
      [by, bx] = b,
      dx = bx - ax,
      dy = by - ay,
      ts = [0, 1],
      meters = coordinateDistance(a, b);
    length += meters;
    for (const p of area)
      for (const ring of p)
        for (let j = 1; j < ring.length; j++) {
          const [cx, cy] = ring[j - 1],
            [ex, ey] = ring[j],
            sx = ex - cx,
            sy = ey - cy,
            den = dx * sy - dy * sx;
          if (Math.abs(den) < 1e-18) continue;
          const t = ((cx - ax) * sy - (cy - ay) * sx) / den,
            u = ((cx - ax) * dy - (cy - ay) * dx) / den;
          if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
        }
    ts.sort((a, b) => a - b);
    const at = (t: number): Coordinate => [ay + dy * t, ax + dx * t];
    for (let j = 1; j < ts.length; j++) {
      const lo = ts[j - 1],
        hi = ts[j];
      if (!withinPolygons(...at((lo + hi) / 2), area)) {
        outside.push({
          from: at(lo),
          to: at(hi),
          meters: (hi - lo) * meters,
          maxDepthMeters: Math.max(
            ...[lo, (lo + hi) / 2, hi].map((t) => depth(at(t))),
          ),
        });
      }
    }
  }
  rows.push({
    id: route.id,
    lengthMeters: length,
    outsideMeters: outside.reduce((n, s) => n + s.meters, 0),
    maxOutsideDepthMeters: Math.max(0, ...outside.map((s) => s.maxDepthMeters)),
    outsideIntervals: outside,
  });
}
await writeFile(
  process.argv[3] ?? "data/reliability/reported-boundary-measurements.json",
  JSON.stringify(rows, null, 2),
);
console.log(
  JSON.stringify(
    rows.map((r) => ({
      ...r,
      outsideIntervals: r.outsideIntervals.slice(0, 3),
    })),
    null,
    2,
  ),
);
