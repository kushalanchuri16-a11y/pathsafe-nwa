import boundary from "@/data/boundary/bentonville.json";
import { fetchJson, type Fetcher } from "@/lib/server/http";
import { cached } from "@/lib/server/cache";
import { sourceUrl, type LocationSource, type SourceInventory } from "./model";
import { normalizeSourceInventory, type OfficialFeature } from "./normalize";
export const CATALOG_TTL = 24 * 3600000;
export const inventoryFreshUntil = (inventory: SourceInventory) =>
  Math.min(
    Date.parse(inventory.fetchedAt) + CATALOG_TTL,
    inventory.expiresAt ?? Infinity,
  );
const bounds = [Infinity, Infinity, -Infinity, -Infinity];
for (const f of boundary.features)
  for (const poly of f.geometry.coordinates)
    for (const ring of poly)
      for (const [x, y] of ring) {
        bounds[0] = Math.min(bounds[0], x);
        bounds[1] = Math.min(bounds[1], y);
        bounds[2] = Math.max(bounds[2], x);
        bounds[3] = Math.max(bounds[3], y);
      }
export const CATALOG_BOUNDS = bounds;
let queue: Promise<unknown> = Promise.resolve();
async function request(url: URL, fetcher: Fetcher, init: RequestInit = {}) {
  // Serialize inventory requests so a cold catalog cannot burst across City services.
  if (fetcher !== fetch) return fetchJson(url.toString(), init, fetcher);
  const task = queue
    .catch(() => {})
    .then(async () => {
      await new Promise((r) => setTimeout(r, 100));
      return fetchJson(url.toString(), init, fetcher);
    });
  queue = task;
  return task;
}
export async function fetchOfficialInventory(
  source: LocationSource,
  fetcher: Fetcher = fetch,
): Promise<SourceInventory> {
  const endpoint = new URL(sourceUrl(source) + "/query"),
    oid = source.objectIdField ?? "OBJECTID";
  const common: Record<string, string> = {
    f: "json",
    where: source.where ?? "1=1",
  };
  if (source.extentOnly)
    Object.assign(common, {
      geometry: CATALOG_BOUNDS.join(","),
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
    });
  endpoint.search = new URLSearchParams({
    ...common,
    returnIdsOnly: "true",
  }).toString();
  const idsBody = (await request(endpoint, fetcher)) as {
    objectIds?: number[] | null;
    objectIdFieldName?: string;
    exceededTransferLimit?: boolean;
  };
  let ids = idsBody.objectIds;
  if (ids === null && idsBody.objectIdFieldName) {
    endpoint.search = new URLSearchParams({
      ...common,
      returnCountOnly: "true",
    }).toString();
    const count = (await request(endpoint, fetcher)) as { count?: number };
    if (count.count === 0) ids = [];
  }
  if (
    !Array.isArray(ids) ||
    idsBody.exceededTransferLimit ||
    ids.length > 200000 ||
    ids.some((id) => !Number.isInteger(id)) ||
    new Set(ids).size !== ids.length
  )
    throw new Error("Incomplete official location ID inventory");
  const features: OfficialFeature[] = [],
    received = new Set<number>();
  for (let start = 0; start < ids.length; start += 1000) {
    const batch = ids.slice(start, start + 1000),
      expected = new Set(batch);
    endpoint.search = new URLSearchParams({
      f: "geojson",
      objectIds: batch.join(","),
      outFields: [oid, ...source.fields].join(","),
      outSR: "4326",
      returnGeometry: "true",
    }).toString();
    // Post long ID batches because the City server rejects oversized query URLs.
    const parameters = endpoint.searchParams.toString();
    endpoint.search = "";
    const body = (await request(endpoint, fetcher, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: parameters,
    })) as {
      type?: string;
      features?: OfficialFeature[];
      exceededTransferLimit?: boolean;
    };
    if (
      body.type !== "FeatureCollection" ||
      !Array.isArray(body.features) ||
      body.exceededTransferLimit ||
      body.features.length !== batch.length
    )
      throw new Error("Partial official location feature batch");
    for (const f of body.features) {
      const id = f.properties?.[oid] ?? f.id;
      if (typeof id !== "number" || !expected.has(id) || received.has(id))
        throw new Error("Mismatched official location batch IDs");
      received.add(id);
      features.push(f);
    }
  }
  if (received.size !== ids.length)
    throw new Error("Incomplete official location inventory");
  return normalizeSourceInventory(features, source);
}
export async function loadOfficialInventory(
  source: LocationSource,
  fetcher: Fetcher = fetch,
) {
  return fetcher === fetch
    ? (
        await cached(
          `unified-location-source-v2:${source.id}:${CATALOG_BOUNDS}${source.where ? ":named-v2:" + source.where : ""}${source.cacheVersion ? ":schema-" + source.cacheVersion : ""}`,
          CATALOG_TTL,
          () => fetchOfficialInventory(source, fetcher),
        )
      ).value
    : fetchOfficialInventory(source, fetcher);
}
