import { readFile, writeFile } from "node:fs/promises";
import { isWithinSupportedArea, lineWithinArea } from "../lib/geocoding/area";
import { demoLocations } from "../data/demoLocations";
const dir = "data/reliability",
  base = "http://127.0.0.1:3000";
const sampled = JSON.parse(
  await readFile(dir + "/sampled-addresses.json", "utf8"),
).features;
const cases = [
  ...[
    "Austin-Baggett Park",
    "Lawrence Plaza",
    "Bentonville Public Library",
    "Crystal Bridges Museum of American Art",
    "Memorial Park",
    "Bentonville Community Center",
    "Bentonville Municipal Airport",
  ].map((query) => ({ query, kind: "named" })),
  ...[
    "300 N Main St",
    "500 S Main St",
    "3809 SW Mistletoe Ave",
    ...sampled.map(
      (f: { properties: { ADDRESS: string } }) => f.properties.ADDRESS,
    ),
  ].map((query) => ({ query, kind: "address" })),
];
const results = [];
for (const [i, c] of cases.entries()) {
  const file = `${dir}/case-${String(i + 1).padStart(2, "0")}.json`;
  try {
    results.push(JSON.parse(await readFile(file, "utf8")));
    continue;
  } catch {
    /* New case. */
  }
  if (i > 0) await new Promise((r) => setTimeout(r, 10000));
  const searchResponse = await fetch(
      base + "/api/locations?q=" + encodeURIComponent(c.query),
    ),
    search = await searchResponse.json();
  const selected = search.results?.[0],
    record: { [k: string]: unknown } = {
      ...c,
      searchStatus: searchResponse.status,
      search,
      inside: selected
        ? isWithinSupportedArea(...(selected.point as [number, number]))
        : null,
      selected,
    };
  if (selected) {
    const destination = c.query.toLowerCase().includes("mistletoe")
      ? JSON.parse(await readFile(dir + "/crystal-search.json", "utf8"))
          .results[0]
      : c.query === "Lawrence Plaza"
        ? demoLocations.start
        : demoLocations.destination;
    const response = await fetch(base + "/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: { label: selected.label, point: selected.point },
        destination: { label: destination.label, point: destination.point },
      }),
      signal: AbortSignal.timeout(65000),
    }).catch((e) => ({ status: 0, json: async () => ({ error: e.message }) }));
    const body = await response.json();
    record.status = response.status;
    record.destination = destination;
    record.body = body;
    if (body.comparison)
      record.routesInside = body.comparison.routes.every(
        (r: { geometry: [number, number][] }) => lineWithinArea(r.geometry),
      );
  }
  await writeFile(file, JSON.stringify(record, null, 2) + "\n");
  results.push(record);
  console.log(
    i + 1,
    c.query,
    record.status ?? "no search result",
    (record.body as { error?: string })?.error ?? "success",
  );
}
await writeFile(
  dir + "/live-summary.json",
  JSON.stringify(
    { validatedAt: new Date().toISOString(), cases: results },
    null,
    2,
  ) + "\n",
);
