import { readFile, writeFile } from "node:fs/promises";
import { fetchJson } from "../lib/server/http";
const root = "https://gis.bentonvillear.com/arcgis/rest/services/";
for (const [layer, name, group, field] of [
  [
    "Planning/Community_Development23/MapServer/174",
    "sidewalk-type-counts",
    "trltyptxt,trlsubtype",
    "OBJECTID",
  ],
  [
    "Parks/Sidewalk_Gap_Identification_Web_Map/MapServer/1",
    "gap-map-type-counts",
    "trltyptxt,trlsubtype",
    "OBJECTID_1",
  ],
  [
    "Parks/Parks_Recreation18/MapServer/8",
    "park-feature-types",
    "type",
    "OBJECTID",
  ],
  [
    "Parks/Parks_Recreation18/MapServer/184",
    "plan-priorities",
    "Existing,Type",
    "OBJECTID",
  ],
  [
    "Parks/Parks_Recreation18/MapServer/186",
    "plan-loop",
    "Existing,Type",
    "OBJECTID",
  ],
  [
    "Parks/Parks_Recreation18/MapServer/187",
    "plan-zones",
    "Existing,Type",
    "OBJECTID",
  ],
]) {
  const file = `data/demo-search/audit/${name}.json`;
  let result;
  try {
    result = JSON.parse(await readFile(file, "utf8"));
  } catch {
    const url = new URL(root + layer + "/query");
    url.search = new URLSearchParams({
      f: "json",
      where: "1=1",
      geometry: "-94.27,36.32,-94.17,36.42",
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      groupByFieldsForStatistics: group,
      outStatistics: JSON.stringify([
        {
          statisticType: "count",
          onStatisticField: field,
          outStatisticFieldName: "record_count",
        },
      ]),
      returnGeometry: "false",
    }).toString();
    result = await fetchJson(url.toString());
    await writeFile(file, JSON.stringify(result, null, 2) + "\n");
  }
  console.log(
    name,
    (result as { features: { attributes: unknown }[] }).features?.map(
      (f) => f.attributes,
    ),
  );
}
