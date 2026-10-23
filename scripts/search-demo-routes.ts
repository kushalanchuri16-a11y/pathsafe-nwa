import { readFile, writeFile, mkdir } from "node:fs/promises";
import { getCachedValhalla } from "../lib/routing/valhalla";
import type { Coordinate } from "../types/routes";
interface CityPoint {
  properties: {
    OBJECTID: number;
    COMMON_NAME: string;
    ADDRESS: string;
    STATUS: string;
  };
  geometry: { coordinates: [number, number] };
}
const folder = "data/demo-search";
await mkdir(folder, { recursive: true });
const official = JSON.parse(
  await readFile(folder + "/audit/public-location-candidates.json", "utf8"),
) as { features: CityPoint[] };
// Freeze meaningful civic/school/park trips before looking at route outcomes.
const selections: [number, number][] = [
  [20, 68],
  [20, 77],
  [100, 68],
  [68, 77],
  [68, 90],
  [35, 77],
  [67, 51],
  [86, 77],
  [72, 67],
  [127, 68],
  [118, 67],
  [17, 137],
  [17, 68],
  [3, 29],
  [135, 68],
  [29, 90],
  [6, 35],
  [51, 77],
  [49, 68],
  [5, 67],
];
const location = (id: number) => {
  const f = official.features.find((p) => p.properties.OBJECTID === id);
  if (!f || f.properties.STATUS !== "PERMANENT")
    throw new Error(`Unverified location ${id}`);
  return {
    label: f.properties.COMMON_NAME,
    objectId: id,
    address: f.properties.ADDRESS,
    point: [f.geometry.coordinates[1], f.geometry.coordinates[0]] as Coordinate,
    source:
      "https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/194",
  };
};
const pairs = selections.map(([a, b], i) => ({
  id: `pair-${String(i + 1).padStart(2, "0")}`,
  start: location(a),
  destination: location(b),
}));
await writeFile(
  folder + "/verified-pairs.json",
  JSON.stringify(
    {
      selectedAt: new Date().toISOString(),
      publicRequestSpacingSeconds: 10,
      pairs,
    },
    null,
    2,
  ) + "\n",
);
for (const [index, pair] of pairs.entries()) {
  const file = folder + "/" + pair.id + "-routing.json";
  try {
    await readFile(file);
    console.log(pair.id, "recorded; no request");
    continue;
  } catch {
    // No saved response: request this pair below.
  }
  if (index > 0) await new Promise((resolve) => setTimeout(resolve, 10000));
  console.log(pair.id, `${pair.start.label} → ${pair.destination.label}`);
  try {
    const result = await getCachedValhalla({
      start: pair.start.point,
      destination: pair.destination.point,
    });
    await writeFile(
      file,
      JSON.stringify(
        {
          pair,
          retrievedAt: result.fetchedAt,
          cacheHit: result.cacheHit,
          routing: result.value,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "  ",
      result.value.routes.length,
      "distinct candidates; cache hit",
      result.cacheHit,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeFile(
      file,
      JSON.stringify(
        { pair, attemptedAt: new Date().toISOString(), error: message },
        null,
        2,
      ) + "\n",
    );
    console.log("  UNAVAILABLE:", message);
  }
}
