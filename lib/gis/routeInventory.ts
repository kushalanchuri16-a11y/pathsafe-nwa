import { getPedestrianInventory } from "./pedestrianInventory";
import { demoBounds } from "@/lib/analysis/geometry";
import type { Coordinate, InfrastructureSegment } from "@/types/routes";
// Keep existing bounded source fetchers/completeness guards. Larger trip envelopes
// are tiled; a tile is requested only if it intersects candidate line segments.
export function routeQueryBounds(lines: Coordinate[][]) {
  const b = demoBounds(lines);
  if (b[2] - b[0] <= 0.08 && b[3] - b[1] <= 0.08) return [b];
  const nx = Math.ceil((b[2] - b[0]) / 0.075),
    ny = Math.ceil((b[3] - b[1]) / 0.075),
    tiles: [number, number, number, number][] = [];
  for (let x = 0; x < nx; x++)
    for (let y = 0; y < ny; y++) {
      const tile: [number, number, number, number] = [
        b[0] + (x * (b[2] - b[0])) / nx,
        b[1] + (y * (b[3] - b[1])) / ny,
        b[0] + ((x + 1) * (b[2] - b[0])) / nx,
        b[1] + ((y + 1) * (b[3] - b[1])) / ny,
      ];
      if (
        lines.some((line) =>
          line.some(
            (p, i) =>
              i > 0 &&
              Math.max(p[1], line[i - 1][1]) >= tile[0] - 0.001 &&
              Math.min(p[1], line[i - 1][1]) <= tile[2] + 0.001 &&
              Math.max(p[0], line[i - 1][0]) >= tile[1] - 0.001 &&
              Math.min(p[0], line[i - 1][0]) <= tile[3] + 0.001,
          ),
        )
      )
        tiles.push(tile);
    }
  return tiles;
}
function unique(segments: InfrastructureSegment[]) {
  return [
    ...new Map(
      segments.map((s) => [s.id + JSON.stringify(s.geometry), s]),
    ).values(),
  ];
}
export async function getRouteInventory(lines: Coordinate[][]) {
  const tiles = routeQueryBounds(lines),
    results: Awaited<ReturnType<typeof getPedestrianInventory>>[] = [];
  for (let i = 0; i < tiles.length; i += 2)
    results.push(
      ...(await Promise.all(
        tiles.slice(i, i + 2).map((b) => getPedestrianInventory(b)),
      )),
    );
  const first = results[0];
  if (results.length === 1) return first;
  const segments = unique(results.flatMap((r) => r.dataset.segments));
  const mergeSource = (key: "sidewalks" | "trails") => ({
    ...first[key],
    fetchedAt: results.map((r) => r[key].fetchedAt).sort()[0],
    cacheHit: results.every((r) => r[key].cacheHit),
    value: {
      ...first[key].value,
      segments: unique(results.flatMap((r) => r[key].value.segments)),
      featureCount: new Set(
        results.flatMap((r) =>
          r[key].value.segments.map((s) => s.id.replace(/:\d+$/, "")),
        ),
      ).size,
    },
  });
  const countsByKind: Record<string, number> = {};
  for (const s of segments)
    countsByKind[s.kind] = (countsByKind[s.kind] ?? 0) + 1;
  return {
    sidewalks: mergeSource("sidewalks"),
    trails: mergeSource("trails"),
    dataset: {
      segments,
      featureCount:
        mergeSource("sidewalks").value.featureCount +
        mergeSource("trails").value.featureCount,
      countsByKind,
      warnings: [
        ...new Set(results.flatMap((r) => r.dataset.warnings)),
        `${tiles.length} bounded candidate-envelope tiles retrieved; repeated line parts deduplicated. Multi-tile counts summarize returned line records.`,
      ],
    },
  };
}
