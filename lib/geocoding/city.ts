import type { Fetcher } from "@/lib/server/http";
import type { GeocodingProvider, LocationResult } from "./provider";
import { isWithinSupportedArea } from "./area";
export const PLACE_SOURCE =
  "https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/194";
export const ADDRESS_SOURCE =
  "https://gis.bentonvillear.com/arcgis/rest/services/Planning/Bentonville_Addresses23/MapServer/2";
interface CityFeature {
  properties: Record<string, unknown>;
  geometry?: { type: string; coordinates: number[] };
}
export function normalizeCityResults(
  features: CityFeature[],
  kind: "place" | "address",
  deduplicate = true,
): LocationResult[] {
  const seen = new Set<string>();
  return features.flatMap((f) => {
    const p = f.properties,
      g = f.geometry,
      c = g?.coordinates;
    if (g?.type !== "Point" || !c || !isWithinSupportedArea(c[1], c[0]))
      return [];
    const label = String(
      kind === "place" ? (p.COMMON_NAME ?? "") : (p.ADDRESS ?? ""),
    ).trim();
    if (!label || !Number.isInteger(p.OBJECTID)) return [];
    const key =
      c.map((n) => n.toFixed(7)).join(",") +
      String(p.ADDRESS ?? label)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    if (deduplicate && seen.has(key)) return [];
    seen.add(key);
    return [
      {
        id: `city-${kind}:${p.OBJECTID}`,
        label,
        point: [c[1], c[0]] as [number, number],
        address: String(p.ADDRESS ?? label),
        kind,
        attribution: "City of Bentonville GIS",
      },
    ];
  });
}
export function cleanQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}
export class CityGeocodingProvider implements GeocodingProvider {
  constructor(private fetcher: Fetcher = fetch) {}
  async search(query: string) {
    const q = cleanQuery(query);
    if (q.length < 3 || q.length > 120) return [];
    const {
      getUnifiedCatalog,
      fetchOfficialLocationSources,
      buildUnifiedLocationCatalog,
    } = await import("./catalog");
    const { buildSearchIndex, searchUnifiedCatalog } =
      await import("./catalog/search");
    if (this.fetcher === fetch)
      return searchUnifiedCatalog(q, await getUnifiedCatalog());
    const { inventories, diagnostics } = await fetchOfficialLocationSources(
      undefined,
      this.fetcher,
    );
    if (!inventories.length)
      throw new Error("All official location inventories are unavailable");
    return searchUnifiedCatalog(
      q,
      buildSearchIndex(buildUnifiedLocationCatalog(inventories, diagnostics)),
    );
  }
}
