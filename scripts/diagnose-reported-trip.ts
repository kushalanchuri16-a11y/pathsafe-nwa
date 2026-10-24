import { readFile, writeFile } from "node:fs/promises";
import { walkingRoutingProvider } from "../lib/routing";
import { coordinateDistance } from "../lib/analysis/geometry";
import { isWithinSupportedArea, lineWithinArea } from "../lib/geocoding/area";
const start = JSON.parse(
    await readFile("data/reliability/mistletoe-search.json", "utf8"),
  ).results[0],
  destination = JSON.parse(
    await readFile("data/reliability/crystal-search.json", "utf8"),
  ).results[0];
const response = await fetch("http://localhost:3000/api/compare", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ start, destination }),
});
await writeFile(
  "data/reliability/reported-before.json",
  JSON.stringify(
    { status: response.status, body: await response.json() },
    null,
    2,
  ),
);
const routing = await walkingRoutingProvider.getCandidates({
  start: start.point,
  destination: destination.point,
});
await writeFile(
  "data/reliability/reported-routing.json",
  JSON.stringify({ start, destination, routing }, null, 2),
);
console.log(
  JSON.stringify(
    {
      start,
      destination,
      inside: [
        isWithinSupportedArea(...(start.point as [number, number])),
        isWithinSupportedArea(...(destination.point as [number, number])),
      ],
      routes: routing.result.routes.map((r) => ({
        id: r.id,
        meters: r.metrics.providerDistanceMeters,
        strictInside: lineWithinArea(r.geometry),
        outsideVertices: r.geometry.filter((p) => !isWithinSupportedArea(...p))
          .length,
        snapStartMeters: coordinateDistance(start.point, r.geometry[0]),
        snapEndMeters: coordinateDistance(
          destination.point,
          r.geometry.at(-1)!,
        ),
      })),
    },
    null,
    2,
  ),
);
