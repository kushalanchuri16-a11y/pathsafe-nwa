import { readFile, writeFile } from "node:fs/promises";
import { normalizeFeatures } from "../lib/gis/bentonville";
import { measureCoverage } from "../lib/analysis/coverage";
import type { InfrastructureSegment } from "../types/routes";
const d = "data/demo-search/";
const mirror = JSON.parse(
  await readFile(d + "audit/gap-map-default-features.json", "utf8"),
);
const study = JSON.parse(await readFile(d + "sidewalk-study.json", "utf8"));
const audited = JSON.parse(
  await readFile(d + "audited-infrastructure.json", "utf8"),
);
const rows = mirror.features
  .flatMap(
    (f: {
      properties: Record<string, string | number | null>;
      geometry: unknown;
    }) =>
      normalizeFeatures([
        {
          ...f,
          properties: {
            ...f.properties,
            OBJECTID: f.properties.OBJECTID_1,
            Closure_Status: f.properties.Closure_St,
          },
        },
      ])
        .segments.filter((s) => s.eligible)
        .map((s: InfrastructureSegment) => {
          const baseline = measureCoverage(
            s.geometry,
            study.dataset.segments,
            0.25,
          );
          return {
            properties: f.properties,
            geometry: s.geometry,
            unmatchedMeters: baseline.uncoveredMeters,
            baselineOverlapWithin25cm: baseline.coverage,
            auditedOverlapWithin25cm: measureCoverage(
              s.geometry,
              audited.segments,
              0.25,
            ).coverage,
            auditedOverlapWithin15m: measureCoverage(
              s.geometry,
              audited.segments,
              15,
            ).coverage,
          };
        }),
  )
  .sort(
    (a: { unmatchedMeters: number }, b: { unmatchedMeters: number }) =>
      b.unmatchedMeters - a.unmatchedMeters,
  );
await writeFile(
  d + "audit/gap-map-residual-review.json",
  JSON.stringify(rows, null, 2) + "\n",
);
console.log(
  "Residual features:",
  rows.filter((r: { unmatchedMeters: number }) => r.unmatchedMeters > 0.01)
    .length,
);
