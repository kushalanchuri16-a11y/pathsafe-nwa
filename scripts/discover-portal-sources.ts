import { readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { OFFICIAL_LOCATION_SOURCES } from "../lib/geocoding/catalog/sources";
import { fetchOfficialInventory } from "../lib/geocoding/catalog/inventory";
import {
  normalizeSearchText,
  normalizeStreetTokens,
} from "../lib/geocoding/search";
const dir = "data/location-catalog/discovery",
  portal = "https://bentonvillear.maps.arcgis.com/sharing/rest",
  force = process.argv.includes("--refresh");
async function json(
  url: string,
  file: string,
  refresh = force,
): Promise<unknown> {
  try {
    if (!refresh && (await stat(file)).mtimeMs + 24 * 3600000 > Date.now())
      return JSON.parse(await readFile(file, "utf8"));
  } catch {
    /* Fetch missing public metadata. */
  }
  await new Promise((r) => setTimeout(r, 200));
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = { error: `Metadata HTTP ${response.status}` };
  }
  await writeFile(file, JSON.stringify(body) + "\n");
  return body;
}
const org = (await json(
  portal + "/portals/self?f=json",
  dir + "/official-portal.json",
)) as { id: string; name: string; urlKey: string };
if (org.id !== "KVEBkgY6kMufuFG2")
  throw new Error("City organization identity changed; review required");
const query = new URLSearchParams({
  f: "json",
  q: `orgid:${org.id} type:"Feature Service"`,
  num: "100",
});
const listing = (await json(
  portal + "/search?" + query,
  dir + "/official-portal-feature-services.json",
)) as {
  total: number;
  results: { id: string; title: string; url: string; owner: string }[];
};
if (!Array.isArray(listing.results) || listing.results.length !== listing.total)
  throw new Error("Incomplete official portal service inventory");
const diagnostics = [];
for (const item of listing.results) {
  if (!item.url) continue;
  const host = new URL(item.url).hostname;
  if (
    ![
      "gis.bentonvillear.com",
      "services1.arcgis.com",
      "utility.arcgis.com",
    ].includes(host)
  ) {
    diagnostics.push({
      id: item.id,
      reason: "Unrecognized host; not trusted automatically",
    });
    continue;
  }
  const single = /\/(MapServer|FeatureServer)\/\d+$/.test(item.url),
    file = dir + "/portal-" + item.id + ".json";
  try {
    const metadata = await json(
      item.url + (single ? "?f=json" : "/layers?f=json"),
      file,
      single || force,
    );
    if (
      single &&
      metadata &&
      typeof metadata === "object" &&
      "fields" in metadata
    )
      await writeFile(file, JSON.stringify({ layers: [metadata] }) + "\n");
    diagnostics.push({ id: item.id, status: "inspected" });
  } catch (error) {
    diagnostics.push({
      id: item.id,
      status: "unavailable",
      reason: String(error),
    });
  }
}
const signature = (
  records: {
    label: string;
    address?: string;
    point: number[];
    supported: boolean;
  }[],
) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        records
          .map((r) => [
            normalizeSearchText(r.label),
            normalizeStreetTokens(r.address ?? ""),
            r.point.map((n) => Number(n.toFixed(7))),
            r.supported,
          ])
          .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      ),
    )
    .digest("hex");
const comparisons = [];
for (const [id, layer] of [
  ["downtown-public-poi", 0],
  ["public-parking", 12],
] as const) {
  const primary = OFFICIAL_LOCATION_SOURCES.find((s) => s.id === id)!;
  const secondary = {
    ...primary,
    id: id + "-comparison",
    path: `https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Public_Parking_Data_Layers_(view)/FeatureServer/${layer}`,
    layer,
  };
  const cache = dir + "/comparison-" + id + ".json";
  try {
    if (!force && (await stat(cache)).mtimeMs + 24 * 3600000 > Date.now()) {
      comparisons.push(JSON.parse(await readFile(cache, "utf8")));
      continue;
    }
  } catch {
    /* New comparison. */
  }
  const a = await fetchOfficialInventory(primary),
    b = await fetchOfficialInventory(secondary);
  const comparison = {
    checkedAt: new Date().toISOString(),
    primary: primary.path,
    secondary: secondary.path,
    rawCounts: [a.rawCount, b.rawCount],
    acceptedCounts: [a.records.length, b.records.length],
    primaryHash: signature(a.records),
    secondaryHash: signature(b.records),
    sameEligibleDestinations: signature(a.records) === signature(b.records),
  };
  await writeFile(cache, JSON.stringify(comparison, null, 2) + "\n");
  comparisons.push(comparison);
}
await writeFile(
  dir + "/portal-discovery-summary.json",
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      organization: org.id,
      services: listing.total,
      diagnostics,
      comparisons,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Official portal inspected:",
  listing.total,
  "feature service items; canonical parking view comparisons:",
  comparisons.map((c) => c.sameEligibleDestinations),
);
