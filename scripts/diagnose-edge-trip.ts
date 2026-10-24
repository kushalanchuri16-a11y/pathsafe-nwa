import { readFile, writeFile } from "node:fs/promises";
import { walkingRoutingProvider } from "../lib/routing";
const row = JSON.parse(await readFile("data/reliability/case-15.json", "utf8"));
const routing = await walkingRoutingProvider.getCandidates({
  start: row.selected.point,
  destination: row.destination.point,
});
await writeFile(
  "data/reliability/edge-routing.json",
  JSON.stringify(
    { start: row.selected, destination: row.destination, routing },
    null,
    2,
  ),
);
