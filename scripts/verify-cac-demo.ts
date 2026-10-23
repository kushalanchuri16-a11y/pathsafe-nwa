import { writeFile } from "node:fs/promises";
import { getLiveRouteComparison } from "../lib/analysis/compare";
import { recommendationStory } from "../lib/presentation/recommendation";
const result = await getLiveRouteComparison();
await writeFile(
  "data/verification/cac-live-comparison.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      start: result.start,
      destination: result.destination,
      routes: result.routes.map((r) => ({ id: r.id, metrics: r.metrics })),
      story: recommendationStory(result),
      provenance: result.provenance,
    },
    null,
    2,
  ),
);
