import { cached } from "@/lib/server/cache";
import {
  rankCandidates,
  isAddressLikeQuery,
  tokenizeSearch,
  streetWords,
  tokenSimilarity,
} from "./search";
import { fetchJson, type Fetcher } from "@/lib/server/http";
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
  private async request(source: string, parameters: Record<string, string>) {
    const url = new URL(source + "/query");
    url.search = new URLSearchParams({
      f: "geojson",
      outSR: "4326",
      returnGeometry: "true",
      ...parameters,
    }).toString();
    const body = (await fetchJson(
      url.toString(),
      { headers: { "X-Client-Id": "PathSafe-NWA-CAC-development" } },
      this.fetcher,
    )) as {
      type?: string;
      features?: CityFeature[];
      exceededTransferLimit?: boolean;
    };
    if (body.type !== "FeatureCollection" || !Array.isArray(body.features))
      throw new Error("Invalid location search response.");
    return body;
  }
  private async catalogue<T>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<T> {
    // Injected test providers never share production cache entries.
    return this.fetcher === fetch
      ? (await cached(key, 24 * 3600000, loader)).value
      : loader();
  }
  private places() {
    return this.catalogue("city-search-places-v1", async () => {
      const body = await this.request(PLACE_SOURCE, {
        where: "STATUS = 'PERMANENT'",
        outFields: "OBJECTID,COMMON_NAME,ADDRESS",
        resultRecordCount: "1000",
        orderByFields: "OBJECTID",
      });
      if (body.exceededTransferLimit || body.features!.length >= 1000)
        throw new Error("Official place catalogue exceeds supported size.");
      return normalizeCityResults(body.features!, "place", false).map((r) =>
        r.id === "city-place:124"
          ? { ...r, label: `Bentonville Municipal Airport · ${r.label}` }
          : r,
      );
    });
  }
  private streetNames() {
    return this.catalogue("city-search-streets-v1", async () => {
      const body = await this.request(ADDRESS_SOURCE, {
        where: "1=1",
        outFields: "STNAME",
        returnDistinctValues: "true",
        returnGeometry: "false",
        resultRecordCount: "2000",
        orderByFields: "STNAME",
      });
      if (body.exceededTransferLimit || body.features!.length >= 2000)
        throw new Error("Official street catalogue exceeds supported size.");
      return body
        .features!.map((f) => String(f.properties.STNAME ?? ""))
        .filter(Boolean);
    });
  }
  async search(query: string) {
    const q = cleanQuery(query);
    if (q.length < 3 || q.length > 120 || !/^[\p{L}\p{N}\s.,'’-]+$/u.test(q))
      return [];
    const tokens = tokenizeSearch(q, true).filter(
      (t) =>
        ![
          "bentonville",
          "arkansas",
          "ar",
          "city",
          "of",
          "the",
          "at",
          "in",
        ].includes(t),
    );
    const number = tokens.find((t) => /^\d+$/.test(t));
    // A street suffix/direction alone must not turn a named destination into an address.
    const addressLike = isAddressLikeQuery(q);
    if (!number) {
      const places = rankCandidates(q, await this.places());
      if (places.length || !addressLike) return places;
    }
    const important = tokens.filter(
      (t) => !/^\d+$/.test(t) && !streetWords.has(t),
    );
    if (!important.length) return [];
    const escape = (s: string) => s.replaceAll("'", "''");
    let where: string;
    if (number) {
      // Exact house number bounds the remote query even with a misspelled street.
      where = `UPPER(ADDRESS) LIKE '${escape(number)} %'`;
    } else {
      const names = await this.streetNames();
      const matching = names
        .map((name) => ({ name, tokens: tokenizeSearch(name, true) }))
        .map((n) => ({
          ...n,
          score: Math.min(
            ...important.map((t) =>
              Math.max(0, ...n.tokens.map((c) => tokenSimilarity(t, c))),
            ),
          ),
        }))
        .filter((n) => n.score >= 0.76)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, 3);
      if (!matching.length) return [];
      where = `STNAME IN (${matching.map((n) => `'${escape(n.name)}'`).join(",")})`;
    }
    const body = await this.request(ADDRESS_SOURCE, {
      where,
      outFields: "OBJECTID,ADDRESS",
      resultRecordCount: "200",
      orderByFields: "ADDRESS,OBJECTID",
    });
    return rankCandidates(
      q,
      normalizeCityResults(body.features!, "address", false),
    );
  }
}
