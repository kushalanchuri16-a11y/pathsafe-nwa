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
    if (seen.has(key)) return [];
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
    if (q.length < 3 || q.length > 120 || !/^[\p{L}\p{N}\s.,'’-]+$/u.test(q))
      return [];
    const kind = /^\d/.test(q) ? "address" : "place",
      field = kind === "address" ? "ADDRESS" : "COMMON_NAME";
    let terms = q
      .toUpperCase()
      .replace(/[^A-Z0-9' ]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    terms = terms.filter(
      (t) =>
        ![
          "BENTONVILLE",
          "ARKANSAS",
          "AR",
          "PUBLIC",
          "OF",
          "AMERICAN",
          "ART",
          "MUSEUM",
        ].includes(t),
    );
    if (!terms.length) return [];
    const abbreviations: Record<string, string> = {
      NORTH: "N",
      SOUTH: "S",
      EAST: "E",
      WEST: "W",
      NORTHEAST: "NE",
      NORTHWEST: "NW",
      SOUTHEAST: "SE",
      SOUTHWEST: "SW",
      STREET: "ST",
      AVENUE: "AVE",
      ROAD: "RD",
      DRIVE: "DR",
      LANE: "LN",
      BOULEVARD: "BLVD",
      PARKWAY: "PKWY",
      COURT: "CT",
      CIRCLE: "CIR",
      PLACE: "PL",
      TRAIL: "TRL",
      HIGHWAY: "HWY",
    };
    if (kind === "address") terms = terms.map((t) => abbreviations[t] ?? t);
    const municipalAlias =
      kind === "place" &&
      [
        "BENTONVILLE MUNICIPAL AIRPORT",
        "BENTONVILLE MUNICIPAL AIRPORT THADEN FIELD",
        "BENTONVILLE AIRPORT",
        "THADEN FIELD",
        "VBT",
      ].includes(
        q
          .toUpperCase()
          .replace(/[^A-Z0-9 ]/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      );
    const where = terms
      .map((t, i) => {
        const safe = t.replaceAll("'", "''");
        if (kind === "address" && i === 0 && /^\d+$/.test(t))
          return `UPPER(ADDRESS) LIKE '${safe} %'`;
        if (
          kind === "address" &&
          ["N", "S", "E", "W", "NE", "NW", "SE", "SW"].includes(t)
        )
          return `UPPER(ADDRESS) LIKE '% ${safe} %'`;
        return `UPPER(${field}) LIKE '%${safe}%'`;
      })
      .join(" AND ");
    const url = new URL(
      (kind === "address" ? ADDRESS_SOURCE : PLACE_SOURCE) + "/query",
    );
    url.search = new URLSearchParams({
      f: "geojson",
      where: municipalAlias
        ? "OBJECTID = 124 AND STATUS = 'PERMANENT'"
        : kind === "place"
          ? `(${where}) AND STATUS = 'PERMANENT'`
          : where,
      outFields:
        kind === "place" ? "OBJECTID,COMMON_NAME,ADDRESS" : "OBJECTID,ADDRESS",
      outSR: "4326",
      returnGeometry: "true",
      resultRecordCount: "8",
      orderByFields: field,
    }).toString();
    const body = (await fetchJson(
      url.toString(),
      { headers: { "X-Client-Id": "PathSafe-NWA-CAC-development" } },
      this.fetcher,
    )) as { type?: string; features?: CityFeature[] };
    if (body.type !== "FeatureCollection" || !Array.isArray(body.features))
      throw new Error("Invalid location search response.");
    const results = normalizeCityResults(body.features, kind);
    return municipalAlias
      ? results.map((r) => ({
          ...r,
          label: `Bentonville Municipal Airport · ${r.label}`,
        }))
      : results;
  }
}
