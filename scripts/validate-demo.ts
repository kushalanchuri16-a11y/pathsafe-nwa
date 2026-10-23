import { writeFile, mkdir } from "node:fs/promises";
import { getLiveRouteComparison } from "../lib/analysis/compare";
const result = await getLiveRouteComparison();
await mkdir("data/verification", { recursive: true });
await writeFile(
  "data/verification/live-comparison.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      source: result.source,
      provenance: result.provenance,
      recommendation: result.recommendation,
      routes: result.routes.map((r) => ({
        id: r.id,
        name: r.name,
        vertices: r.geometry.length,
        metrics: r.metrics,
      })),
    },
    null,
    2,
  ),
);
