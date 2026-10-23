import { readFile, writeFile } from "node:fs/promises";
import { measureCoverage } from "../lib/analysis/coverage";
import {
  projector,
  routeLengthMeters,
  coordinateDistance,
} from "../lib/analysis/geometry";
import type { RouteComparison } from "../types/routes";
const result: RouteComparison = JSON.parse(
  await readFile("data/verification/live-comparison.json", "utf8"),
);
const summary = {
  toleranceSensitivity: result.routes.map((r) => ({
    id: r.id,
    coverageAt10m: measureCoverage(r.geometry, result.infrastructure, 10)
      .coverage,
    coverageAt15m: measureCoverage(r.geometry, result.infrastructure, 15)
      .coverage,
    coverageAt20m: measureCoverage(r.geometry, result.infrastructure, 20)
      .coverage,
  })),
  differences: result.routes.flatMap((a, i) =>
    result.routes
      .slice(i + 1)
      .map((b) => ({
        a: a.id,
        b: b.id,
        percentANearBWithin5m: measureCoverage(
          a.geometry,
          [{ geometry: b.geometry }],
          5,
        ).coverage,
        percentBNearAWithin5m: measureCoverage(
          b.geometry,
          [{ geometry: a.geometry }],
          5,
        ).coverage,
      })),
  ),
  projectionCheck: result.routes.map((r) => {
    const p = projector(r.geometry[0]),
      xy = r.geometry.map(p);
    const localLength = xy
      .slice(1)
      .reduce(
        (sum, b, i) => sum + Math.hypot(b[0] - xy[i][0], b[1] - xy[i][1]),
        0,
      );
    const geodesic = routeLengthMeters(r.geometry);
    return {
      id: r.id,
      localLengthMeters: localLength,
      geodesicMeters: geodesic,
      relativeDifferencePercent:
        (100 * Math.abs(localLength - geodesic)) / geodesic,
      startSnapMeters: coordinateDistance(result.start.point, r.geometry[0]),
      destinationSnapMeters: coordinateDistance(
        result.destination.point,
        r.geometry.at(-1)!,
      ),
    };
  }),
};
await writeFile(
  "data/verification/geometry-checks.json",
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
