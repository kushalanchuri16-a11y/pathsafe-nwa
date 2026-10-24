import { readFile, writeFile } from "node:fs/promises";
import { isWithinSupportedArea } from "../lib/geocoding/area";
import { demoLocations } from "../data/demoLocations";
const base = "http://127.0.0.1:3000",
  dir = "data/reliability";
const sample = JSON.parse(
  await readFile(dir + "/official-address-sample.json", "utf8"),
);
const outside = sample.features.filter(
  (f: { geometry: { coordinates: number[] } }) =>
    !isWithinSupportedArea(
      f.geometry.coordinates[1],
      f.geometry.coordinates[0],
    ),
);
console.log("Outside sample records", outside.length);
const cases = [
  {
    query: "Northwest Arkansas National Airport",
    point: [36 + 16 / 60 + 54.73 / 3600, -(94 + 18 / 60 + 24.52 / 3600)],
    source:
      "https://fly.arkansas.gov/uploads/7/5/7/7/75772239/fayettevillespringdale.pdf",
  },
  ...(await Promise.all(
    ["rogers", "centerton", "bella-vista"].map(async (city) => {
      const f = JSON.parse(
        await readFile(`${dir}/outside-${city}.json`, "utf8"),
      ).features[0];
      return {
        query: f.properties.FULL_ADDR,
        point: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
        source: `Official City-hosted Benton County address record ${f.properties.OBJECTID} (${f.properties.CITY})`,
      };
    }),
  )),
];
const negatives = [];
for (const c of cases) {
  await new Promise((r) => setTimeout(r, 1200));
  const search = await (
    await fetch(base + "/api/locations?q=" + encodeURIComponent(c.query))
  ).json();
  const response = await fetch(base + "/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: { label: c.query, point: c.point },
      destination: demoLocations.destination,
    }),
  });
  negatives.push({
    ...c,
    inside: isWithinSupportedArea(...(c.point as [number, number])),
    search,
    status: response.status,
    body: await response.json(),
  });
}
await writeFile(
  dir + "/negative-tests.json",
  JSON.stringify(negatives, null, 2),
);
const queries = [
  "3809 sw mistletoe ave",
  " 3809   SW MISTLETOE AVE., Bentonville, AR ",
  "3809 Southwest Mistletoe Avenue",
  "3809 SW MIST",
  "3809 SW MISTLETOE AVE APT 1",
  "Bentonville Municipal Airport",
  "XNA",
  "Bentonville Community Center",
  "999999 SW NONEXISTENT ST",
];
const searches = [];
for (const q of queries) {
  await new Promise((r) => setTimeout(r, 1200));
  const response = await fetch(
    base + "/api/locations?q=" + encodeURIComponent(q),
  );
  searches.push({
    query: q,
    status: response.status,
    body: await response.json(),
  });
}
await writeFile(
  dir + "/search-variations.json",
  JSON.stringify(searches, null, 2),
);
console.log(
  "Negatives",
  negatives.map((n) => [n.query, n.inside, n.status]),
);
console.log(
  "Searches",
  searches.map((s) => [s.query, s.body.results?.length]),
);
