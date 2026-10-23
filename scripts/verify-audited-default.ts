import { writeFile } from "node:fs/promises";
import { getLiveRouteComparison } from "../lib/analysis/compare";
const result = await getLiveRouteComparison();
await writeFile(
  "data/demo-search/default-live-after-audit.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      provenance: result.provenance,
      recommendation: result.recommendation,
      routes: result.routes.map((r) => ({ id: r.id, metrics: r.metrics })),
    },
    null,
    2,
  ),
);
