import { readFile, writeFile, readdir } from "node:fs/promises";
import { getBentonvilleInfrastructure } from "../lib/gis/bentonville";
import { demoBounds } from "../lib/analysis/geometry";
import { fetchJson } from "../lib/server/http";
import type { RouteCandidate } from "../types/routes";
const folder = "data/demo-search";
const records = await Promise.all(
  (await readdir(folder))
    .filter((f) => f.endsWith("-routing.json"))
    .map(async (f) => JSON.parse(await readFile(folder + "/" + f, "utf8"))),
);
const lines: RouteCandidate[] = records.flatMap((r) => r.routing?.routes ?? []);
const bounds = demoBounds(lines.map((r) => r.geometry));
const baseline = await getBentonvilleInfrastructure(bounds);
await writeFile(
  folder + "/sidewalk-study.json",
  JSON.stringify(
    {
      bounds,
      retrievedAt: baseline.fetchedAt,
      cacheHit: baseline.cacheHit,
      dataset: baseline.value,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Study bounds",
  bounds,
  "Baseline features",
  baseline.value.featureCount,
);
// Inventory a bounded default-trip sample of the older gap-map sidewalk export.
const defaults = records.find((r) => r.pair.id === "pair-01");
const db = demoBounds(
  defaults.routing.routes.map((r: RouteCandidate) => r.geometry),
);
const file = folder + "/audit/gap-map-default-features.json";
try {
  await readFile(file);
  console.log("Gap-map audit sample recorded");
} catch {
  const base =
    "https://gis.bentonvillear.com/arcgis/rest/services/Parks/Sidewalk_Gap_Identification_Web_Map/MapServer/1/query";
  const url = new URL(base);
  url.search = new URLSearchParams({
    f: "json",
    where: "1=1",
    geometry: db.join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    returnIdsOnly: "true",
  }).toString();
  const ids = ((await fetchJson(url.toString())) as { objectIds: number[] })
    .objectIds;
  const features: unknown[] = [];
  for (let offset = 0; offset < ids.length; offset += 250) {
    const batch = ids.slice(offset, offset + 250),
      u = new URL(base);
    u.search = new URLSearchParams({
      f: "geojson",
      objectIds: batch.join(","),
      outFields:
        "OBJECTID_1,OBJECTID,GlobalID,trltyptxt,facdescrip,surftype,bikesallow,useaccess,Closure_St",
      outSR: "4326",
      returnGeometry: "true",
    }).toString();
    const part = (await fetchJson(u.toString())) as { features: unknown[] };
    if (part.features.length !== batch.length)
      throw new Error("Incomplete gap-map audit sample");
    features.push(...part.features);
  }
  await writeFile(
    file,
    JSON.stringify(
      {
        endpoint: base,
        retrievedAt: new Date().toISOString(),
        bounds: db,
        features,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Gap-map sample", features.length);
}
