import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import {
  unpackSnapshot,
  type CatalogSnapshot,
} from "../lib/geocoding/catalog/snapshot";
import { buildUnifiedLocationCatalog } from "../lib/geocoding/catalog";
import {
  buildSearchIndex,
  searchUnifiedCatalog,
} from "../lib/geocoding/catalog/search";
import { normalizeSourceInventory } from "../lib/geocoding/catalog/normalize";
import { OFFICIAL_LOCATION_SOURCES } from "../lib/geocoding/catalog/sources";
import {
  sourceUrl,
  type OfficialLocation,
} from "../lib/geocoding/catalog/model";
import { validateSelection } from "../lib/geocoding/validate";
import { normalizeStreetTokens } from "../lib/geocoding/search";
const dir = "data/location-catalog";
const start = performance.now();
const snapshot = JSON.parse(
  gunzipSync(await readFile(`${dir}/snapshot.json.gz`)).toString(),
) as CatalogSnapshot;
const inventories = unpackSnapshot(snapshot),
  catalog = buildUnifiedLocationCatalog(inventories),
  index = buildSearchIndex(catalog);
const loadedMs = performance.now() - start;
const old = JSON.parse(
  await readFile("data/search/official-places.json", "utf8"),
);
const baseline = buildUnifiedLocationCatalog([
  normalizeSourceInventory(old.features, OFFICIAL_LOCATION_SOURCES[0]),
]);
const audit = (r: OfficialLocation) => {
  const exact = searchUnifiedCatalog(r.label, index).some((x) => x.id === r.id);
  const shorthand =
    r.aliases.find((a) => /\b(MS|ES|JHS|HS)\b/.test(a)) ??
    (r.label.replace(/\s+(school|park)$/i, "") !== r.label
      ? r.label.replace(/\s+(school|park)$/i, "")
      : r.label.split(/\s+/).length >= 3
        ? r.label.split(/\s+/).slice(0, -1).join(" ")
        : r.label);
  const partial =
    shorthand.length >= 3 &&
    searchUnifiedCatalog(shorthand, index).some((x) => x.id === r.id);
  let selectable = false;
  try {
    validateSelection(r);
    selectable = true;
  } catch {
    /* Outside endpoints stay unsupported. */
  }
  return {
    id: r.id,
    name: r.label,
    aliases: r.aliases,
    type: r.type,
    point: r.point,
    address: r.address,
    sources: r.provenance,
    inside: r.supported,
    exact,
    shorthand,
    partial,
    selectable,
    routableEndpoint: selectable,
    reason: !r.supported
      ? "Outside official City Limits (including holes)"
      : !exact
        ? r.label.length < 3
          ? "Official name has fewer than 3 characters; existing minimum query length retained"
          : "Exact name did not appear in the 8-result list"
        : null,
  };
};
const identityMap = new Map(
  catalog.records.flatMap((r) =>
    r.provenance.map((p) => [p.source + ":" + p.sourceObjectId, r] as const),
  ),
);
const sourceNames = inventories.flatMap((i) =>
  i.records
    .filter((r) => r.kind === "place")
    .map((r) => {
      const merged = identityMap.get(
        i.id + ":" + r.provenance[0].sourceObjectId,
      )!;
      const officialName =
        OFFICIAL_LOCATION_SOURCES.find((s) => s.id === i.id)?.kind ===
        "historic"
          ? (r.aliases[0] ?? r.label)
          : r.label;
      return {
        source: i.id,
        objectId: r.provenance[0].sourceObjectId,
        name: officialName,
        point: r.point,
        inside: r.supported,
        canonicalId: merged.id,
        canonicalName: merged.label,
        exact: searchUnifiedCatalog(officialName, index).some(
          (x) => x.id === merged.id,
        ),
        canonicalExact: searchUnifiedCatalog(merged.label, index).some(
          (x) => x.id === merged.id,
        ),
      };
    }),
);
const named = catalog.records.filter((r) => r.kind === "place").map(audit);
const schoolSources = inventories.filter((i) => i.id.startsWith("schools-"));
const schoolInventory = schoolSources.flatMap((i) =>
  i.records.map((r) => {
    const merged = catalog.records.find((c) =>
      c.provenance.some(
        (p) =>
          p.source === i.id &&
          p.sourceObjectId === r.provenance[0].sourceObjectId,
      ),
    )!;
    return {
      ...audit(merged),
      officialName: r.label,
      officialPoint: r.point,
      inventory: i.id,
      objectId: r.provenance[0].sourceObjectId,
      officialExact: searchUnifiedCatalog(r.label, index).some(
        (c) => c.id === merged.id,
      ),
    };
  }),
);
const parks = named.filter(
  (r) =>
    ["park", "recreation", "trail destination"].includes(r.type) ||
    r.sources.some((p) => ["parks", "park-properties"].includes(p.source)),
);
const addresses = catalog.records.filter(
  (r) => r.supported && r.kind === "address",
);
const selected: OfficialLocation[] = [];
for (const q of ["300 N Main St", "500 S Main St", "3809 SW Mistletoe Ave"]) {
  const r = searchUnifiedCatalog(q, index)[0];
  if (r) selected.push(r);
}
// Farthest-point sampling spreads address checks over the entire supported municipality.
while (selected.length < 18) {
  let best: OfficialLocation | undefined,
    spread = -1;
  for (const r of addresses) {
    if (selected.some((x) => x.id === r.id)) continue;
    const distance = Math.min(
      ...selected.map((x) =>
        Math.hypot(r.point[0] - x.point[0], (r.point[1] - x.point[1]) * 0.8),
      ),
    );
    if (distance > spread) {
      best = r;
      spread = distance;
    }
  }
  selected.push(best!);
}
const addressAudit = selected.map((r) => {
  const expanded = normalizeStreetTokens(r.label),
    partial = r.label.split(" ").slice(0, -1).join(" ");
  return {
    ...audit(r),
    expanded,
    expandedWorks: searchUnifiedCatalog(expanded, index).some(
      (x) => x.id === r.id,
    ),
    partialQuery: partial,
    partialWorks: searchUnifiedCatalog(partial, index).some(
      (x) => x.id === r.id,
    ),
  };
});
const queries = [
  "Creekside Middle School",
  "Creekside Middle",
  "Creekside MS",
  "creekside",
  "Osage Creek Elementary",
  "Crystal Bridges",
  "crystal bridge",
  "crstal bridges",
  "Bentonville Public Library",
  "bentonville library",
  "public library",
  "Bentonville Community Center",
  "community center",
  "Bentonville Municipal Airport",
  "bentonville airport",
  "municipal airport",
  "Memorial Park",
  "Austin-Baggett Park",
  "Lawrence Plaza",
  "300 N Main St",
  "500 S Main St",
  "3809 SW Mistletoe Ave",
  "Creekside Park",
  "XNA",
  "Northwest Arkansas National Airport",
  "Rogers High School",
  "Fayetteville Public Library",
  "2 BLOWING SPRINGS RD",
  "999999 Main Street",
  "unicorn blargh zzq",
];
const queryAudit = queries.map((query) => {
  const t = performance.now(),
    results = searchUnifiedCatalog(query, index);
  return {
    query,
    ms: performance.now() - t,
    results: results.map((r) => ({ id: r.id, label: r.label, point: r.point })),
  };
});
const counts = (records: OfficialLocation[]) =>
  Object.fromEntries(
    [
      "named",
      "school",
      "park",
      "recreation",
      "civic facility",
      "public facility",
      "plaza",
      "airport",
      "landmark",
      "museum",
      "trail destination",
      "address",
    ].map((type) => [
      type,
      records.filter(
        (r) =>
          r.supported &&
          (type === "named" ? r.kind === "place" : r.type === type),
      ).length,
    ]),
  );
const report = {
  checkedAt: new Date().toISOString(),
  snapshotAt: snapshot.createdAt,
  loadedMs,
  rssMB: process.memoryUsage().rss / 1048576,
  before: counts(baseline.records),
  after: counts(catalog.records),
  rawNormalized: inventories.reduce((n, i) => n + i.records.length, 0),
  duplicatesRemoved: catalog.duplicatesRemoved,
  outside: catalog.records.filter((r) => !r.supported).length,
  outsideNamed: named.filter((r) => !r.inside).length,
  invalidCoordinates: inventories
    .flatMap((i) => i.rejected)
    .filter((r) => /geometry|coordinate/.test(r.reason)).length,
  registry: OFFICIAL_LOCATION_SOURCES.map((s) => ({ ...s, url: sourceUrl(s) })),
  sources: inventories.map((i) => ({
    ...i,
    records: undefined,
    source: sourceUrl(OFFICIAL_LOCATION_SOURCES.find((s) => s.id === i.id)!),
    normalized: i.records.length,
    outside: i.records.filter((r) => !r.supported).length,
  })),
  named,
  sourceNames,
  unboundDirectoryNames:
    inventories.find((i) => i.id === "city-parks-directory")?.rejected ?? [],
  schoolInventory,
  parks,
  addresses: addressAudit,
  queries: queryAudit,
  missing: named.filter((r) => r.inside && !r.exact),
};
await writeFile(
  `${dir}/completeness.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      before: report.before,
      after: report.after,
      duplicates: report.duplicatesRemoved,
      missing: report.missing.map((r) => r.name),
      schoolRecords: schoolInventory.length,
      schoolFailures: schoolInventory
        .filter((r) => r.inside && !r.officialExact)
        .map((r) => r.officialName),
      addressFailures: addressAudit
        .filter((r) => !r.exact || !r.expandedWorks || !r.partialWorks)
        .map((r) => r.name),
      loadedMs,
      queryMaxMs: Math.max(...queryAudit.map((r) => r.ms)),
    },
    null,
    2,
  ),
);

const negative = new Set([
  "XNA",
  "Northwest Arkansas National Airport",
  "Rogers High School",
  "Fayetteville Public Library",
  "2 BLOWING SPRINGS RD",
  "999999 Main Street",
  "unicorn blargh zzq",
]);
const failures =
  report.missing.length +
  schoolInventory.filter(
    (r) => r.inside && (!r.officialExact || !r.partial || !r.selectable),
  ).length +
  parks.filter((r) => r.inside && (!r.exact || !r.partial || !r.selectable))
    .length +
  addressAudit.filter((r) => !r.exact || !r.expandedWorks || !r.partialWorks)
    .length +
  queryAudit.filter((r) =>
    negative.has(r.query) ? r.results.length > 0 : r.results.length === 0,
  ).length;
if (failures) {
  console.error("Catalog audit failures:", failures);
  process.exitCode = 1;
}
