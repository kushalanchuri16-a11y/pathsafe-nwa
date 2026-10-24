import { readFile, writeFile } from "node:fs/promises";
import { coordinateDistance } from "../lib/analysis/geometry";
import { isWithinSupportedArea } from "../lib/geocoding/area";
const raw = JSON.parse(
    await readFile("data/reliability/official-address-sample.json", "utf8"),
  ),
  features = raw.features.filter((f: { geometry: { coordinates: number[] } }) =>
    isWithinSupportedArea(f.geometry.coordinates[1], f.geometry.coordinates[0]),
  );
let pair;
for (let i = 0; i < features.length && !pair; i++)
  for (let j = i + 1; j < features.length; j++) {
    const a = features[i].geometry.coordinates,
      b = features[j].geometry.coordinates,
      d = coordinateDistance([a[1], a[0]], [b[1], b[0]]);
    if (d >= 50 && d <= 80) {
      pair = [features[i], features[j]];
      break;
    }
  }
if (!pair) throw new Error("No short pair in sample");
const points = [];
for (const f of pair) {
  await new Promise((r) => setTimeout(r, 1200));
  const result = await (
    await fetch(
      "http://127.0.0.1:3000/api/locations?q=" +
        encodeURIComponent(f.properties.ADDRESS),
    )
  ).json();
  points.push(result.results[0]);
}
const response = await fetch("http://127.0.0.1:3000/api/compare", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ start: points[0], destination: points[1] }),
});
await writeFile(
  "data/reliability/short-trip.json",
  JSON.stringify(
    {
      sampledPair: pair,
      selected: points,
      status: response.status,
      body: await response.json(),
    },
    null,
    2,
  ),
);
