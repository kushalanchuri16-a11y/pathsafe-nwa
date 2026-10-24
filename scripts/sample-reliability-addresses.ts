import { readFile, writeFile } from "node:fs/promises";
import { isWithinSupportedArea } from "../lib/geocoding/area";
import { coordinateDistance } from "../lib/analysis/geometry";
import type { Coordinate } from "../types/routes";
const raw = JSON.parse(
  await readFile("data/reliability/official-address-sample.json", "utf8"),
);
const pool = raw.features.filter(
  (f: {
    properties: { ADDRESS: string };
    geometry: { coordinates: Coordinate };
  }) =>
    f.properties.ADDRESS &&
    isWithinSupportedArea(f.geometry.coordinates[1], f.geometry.coordinates[0]),
);
const selected = [pool[0]];
while (selected.length < 10) {
  let best = -1,
    max = -1;
  for (let i = 0; i < pool.length; i++) {
    if (selected.includes(pool[i])) continue;
    const point = pool[i].geometry.coordinates;
    const distance = Math.min(
      ...selected.map((s) =>
        coordinateDistance(
          [point[1], point[0]],
          [s.geometry.coordinates[1], s.geometry.coordinates[0]],
        ),
      ),
    );
    if (distance > max) {
      max = distance;
      best = i;
    }
  }
  selected.push(pool[best]);
}
await writeFile(
  "data/reliability/sampled-addresses.json",
  JSON.stringify(
    {
      method:
        "Ten inside-boundary records chosen by deterministic farthest-point sampling from a bounded 200-record official City address query; not citywide random sampling",
      features: selected,
    },
    null,
    2,
  ),
);
console.log(selected.map((f) => f.properties.ADDRESS));
