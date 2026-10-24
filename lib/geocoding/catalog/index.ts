import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { loadParkDirectory, PARKS_DIRECTORY_ID } from "./parksDirectory";
import { OFFICIAL_LOCATION_SOURCES } from "./sources";
import { loadOfficialInventory, inventoryFreshUntil } from "./inventory";
import { dedupeLocations } from "./dedupe";
import { reconcileOfficialNames } from "./reconcileNames";
import { unpackSnapshot, type CatalogSnapshot } from "./snapshot";
import { buildSearchIndex, type CatalogIndex } from "./search";
import {
  sourceUrl,
  type LocationSource,
  type SourceInventory,
  type CatalogDiagnostic,
  type UnifiedCatalog,
} from "./model";
import type { Fetcher } from "@/lib/server/http";
export async function fetchOfficialLocationSources(
  sources: LocationSource[] = OFFICIAL_LOCATION_SOURCES,
  fetcher: Fetcher = fetch,
  seeds: SourceInventory[] = [],
) {
  // One unavailable inventory must not remove healthy categories from autocomplete.
  const gisSources = sources.filter((s) => s.id !== PARKS_DIRECTORY_ID);
  const results = await Promise.allSettled(
    gisSources.map(async (source) => {
      const seed = seeds.find((s) => s.id === source.id);
      if (seed && inventoryFreshUntil(seed) > Date.now()) return seed;
      return loadOfficialInventory(source, fetcher);
    }),
  );
  const inventories: SourceInventory[] = [],
    diagnostics: CatalogDiagnostic[] = [];
  results.forEach((r, i) => {
    const source = gisSources[i];
    if (r.status === "fulfilled") {
      inventories.push(r.value);
      diagnostics.push({
        source: sourceUrl(source),
        status: "available",
        fetchedAt: r.value.fetchedAt,
        rawCount: r.value.rawCount,
      });
    } else
      diagnostics.push({
        source: sourceUrl(source),
        status: "unavailable",
        message:
          r.reason instanceof Error
            ? r.reason.message
            : "Inventory unavailable",
      });
  });
  const directorySource = sources.find((s) => s.id === PARKS_DIRECTORY_ID);
  if (directorySource) {
    try {
      const seed = seeds.find((i) => i.id === PARKS_DIRECTORY_ID);
      if (fetcher !== fetch)
        throw new Error("No official directory fixture supplied");
      const inventory =
        seed && inventoryFreshUntil(seed) > Date.now()
          ? seed
          : await loadParkDirectory(inventories);
      inventories.push(inventory);
      diagnostics.push({
        source: sourceUrl(directorySource),
        status: "available",
        fetchedAt: inventory.fetchedAt,
        rawCount: inventory.rawCount,
      });
    } catch (error) {
      diagnostics.push({
        source: sourceUrl(directorySource),
        status: "unavailable",
        message:
          error instanceof Error
            ? error.message
            : "Official parks directory unavailable",
      });
    }
  }
  return { inventories, diagnostics };
}
export function buildUnifiedLocationCatalog(
  inventories: SourceInventory[],
  diagnostics: CatalogDiagnostic[] = [],
): UnifiedCatalog {
  const merged = dedupeLocations(inventories.flatMap((i) => i.records));
  return {
    ...merged,
    records: reconcileOfficialNames(merged.records),
    inventories,
    diagnostics,
    version: inventories
      .map((i) => i.id + ":" + i.fetchedAt)
      .sort()
      .join("|"),
  };
}
let active: Promise<CatalogIndex> | undefined,
  ready: CatalogIndex | undefined,
  expiresAt = 0;
export async function getUnifiedCatalog() {
  if (ready && expiresAt > Date.now()) return ready;
  if (active) return active;
  active = (async () => {
    // A generated official snapshot is a cold-start cache, not manually entered locations.
    let seeds: SourceInventory[] = [];
    try {
      const snapshot = JSON.parse(
        gunzipSync(
          await readFile(
            path.join(process.cwd(), "data/location-catalog/snapshot.json.gz"),
          ),
        ).toString("utf8"),
      ) as CatalogSnapshot;
      seeds = unpackSnapshot(snapshot);
    } catch {
      // A broken cold-start asset must not prevent independent official sources from loading.
      console.warn(
        "Official catalog snapshot unavailable; rebuilding from independent official inventories",
      );
    }
    const { inventories, diagnostics } = await fetchOfficialLocationSources(
      OFFICIAL_LOCATION_SOURCES,
      fetch,
      seeds,
    );
    if (!inventories.length)
      throw new Error("All official location inventories are unavailable");
    const catalog = buildUnifiedLocationCatalog(inventories, diagnostics);
    // Retain the searchable identities and source diagnostics, not duplicate raw inventories.
    ready = buildSearchIndex({ ...catalog, inventories: [] });
    expiresAt = diagnostics.some((d) => d.status === "unavailable")
      ? Date.now() + 60000
      : Math.min(...inventories.map((i) => inventoryFreshUntil(i)));
    return ready;
  })();
  try {
    return await active;
  } finally {
    active = undefined;
  }
}
