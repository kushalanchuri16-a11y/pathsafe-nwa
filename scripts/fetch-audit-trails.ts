import { writeFile, readFile } from "node:fs/promises";
import { fetchJson } from "../lib/server/http";
const base =
  "https://gis.bentonvillear.com/arcgis/rest/services/Parks/Parks_Recreation18/MapServer/158/query";
const file = "data/demo-search/audit/parks-trail-features.json";
let data;
try {
  data = JSON.parse(await readFile(file, "utf8"));
} catch {
  const common = {
    where: "trlsubtype IN (4,6,7,8)",
    geometry: "-94.27,36.32,-94.17,36.42",
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
  };
  const idsUrl = new URL(base);
  idsUrl.search = new URLSearchParams({
    ...common,
    f: "json",
    returnIdsOnly: "true",
  }).toString();
  const inventory = (await fetchJson(idsUrl.toString())) as {
    objectIds: number[];
  };
  if (!Array.isArray(inventory.objectIds) || inventory.objectIds.length > 2000)
    throw new Error("Unexpected trail inventory");
  const features: unknown[] = [];
  for (let offset = 0; offset < inventory.objectIds.length; offset += 250) {
    const ids = inventory.objectIds.slice(offset, offset + 250),
      url = new URL(base);
    url.search = new URLSearchParams({
      f: "geojson",
      objectIds: ids.join(","),
      outSR: "4326",
      outFields:
        "OBJECTID,GlobalID,prim_name,trlsubtype,trltyptxt,facdescrip,surftype,bikesallow,useaccess,maintowner,Approved,constrdate,Closure_Status,Start_Closure,End_Closure",
      returnGeometry: "true",
    }).toString();
    const result = (await fetchJson(url.toString())) as {
      features: { properties: { OBJECTID: number } }[];
      exceededTransferLimit?: boolean;
    };
    if (
      result.exceededTransferLimit ||
      !result.features ||
      result.features.length !== ids.length ||
      ids.some(
        (id) => !result.features.some((f) => f.properties.OBJECTID === id),
      )
    )
      throw new Error("Incomplete trail batch");
    features.push(...result.features);
  }
  data = {
    retrievedAt: new Date().toISOString(),
    endpoint: base,
    scope: common,
    features,
  };
  await writeFile(file, JSON.stringify(data, null, 2) + "\n");
}
for (const key of [
  "trlsubtype",
  "trltyptxt",
  "facdescrip",
  "surftype",
  "bikesallow",
  "useaccess",
  "maintowner",
  "Approved",
  "Closure_Status",
]) {
  const counts: Record<string, number> = {};
  for (const f of data.features) {
    const value = String(f.properties[key]);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  console.log(key, counts);
}
console.log(
  "Examples",
  data.features
    .filter(
      (f: { properties: { trlsubtype: number } }) =>
        f.properties.trlsubtype === 4,
    )
    .slice(0, 12)
    .map((f: { properties: unknown }) => f.properties),
);
