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
// A deployment searches its reviewed official snapshot. Refreshing 27 inventories
// belongs in catalog:refresh, not inside a serverless autocomplete request.
export function indexCatalogSnapshot(snapshot: CatalogSnapshot) {
  if (
    snapshot?.schemaVersion !== 1 ||
    !Array.isArray(snapshot.inventories) ||
    !Number.isFinite(Date.parse(snapshot.createdAt)) ||
    snapshot.inventories.length !== OFFICIAL_LOCATION_SOURCES.length ||
    new Set(snapshot.inventories.map((i) => i.id)).size !==
      OFFICIAL_LOCATION_SOURCES.length ||
    OFFICIAL_LOCATION_SOURCES.some(
      (source) => !snapshot.inventories.some((i) => i.id === source.id),
    )
  )
    throw new Error("Incomplete official catalog snapshot; refresh required");
  const inventories = unpackSnapshot(snapshot);
  const diagnostics: CatalogDiagnostic[] = inventories.map((i) => ({
    source: sourceUrl(OFFICIAL_LOCATION_SOURCES.find((s) => s.id === i.id)!),
    status: "available",
    fetchedAt: i.fetchedAt,
    rawCount: i.rawCount,
    message:
      "Bundled official catalog inventory; timestamps reflect its recorded retrieval, not a live refresh.",
  }));
  const catalog = buildUnifiedLocationCatalog(inventories, diagnostics);
  return buildSearchIndex({ ...catalog, inventories: [] });
}
let active: Promise<CatalogIndex> | undefined, ready: CatalogIndex | undefined;
export async function getUnifiedCatalog() {
  if (ready) return ready;
  if (active) return active;
  active = (async () => {
    try {
      const snapshot = JSON.parse(
        gunzipSync(
          await readFile(
            path.join(process.cwd(), "data/location-catalog/snapshot.json.gz"),
          ),
        ).toString("utf8"),
      ) as CatalogSnapshot;
      ready = indexCatalogSnapshot(snapshot);
      return ready;
    } catch {
      // Fail promptly rather than starting a citywide rebuild on a request deadline.
      console.error(
        "Official catalog snapshot unavailable or invalid; run catalog:refresh and include the snapshot in deployment.",
      );
      throw new Error("Official location catalog is unavailable");
    }
  })();
  try {
    return await active;
  } finally {
    active = undefined;
  }
}
