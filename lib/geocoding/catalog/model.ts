import type { LocationResult } from "../provider";
export type LocationType =
  | "address"
  | "school"
  | "park"
  | "public facility"
  | "recreation"
  | "landmark"
  | "museum"
  | "plaza"
  | "airport"
  | "trail destination"
  | "civic facility"
  | "other official place";
export interface LocationSource {
  id: string;
  path: string;
  layer: number;
  fields: string[];
  names: string[];
  addresses?: string[];
  addressParts?: string[];
  kind:
    | "common"
    | "school"
    | "park"
    | "poi"
    | "property"
    | "facility"
    | "art"
    | "historic"
    | "address"
    | "address-place"
    | "business"
    | "parking";
  priority: number;
  objectIdField?: string;
  extentOnly?: boolean;
  where?: string;
  cacheVersion?: number;
}
export interface LocationProvenance {
  source: string;
  sourceLayer: string;
  sourceObjectId: number;
  coordinateMethod: "official point" | "polygon interior";
  priority: number;
  nameEvidence?: { reviewedAt: string; urls: string[] };
  extent?: number[];
  coordinateSource?: {
    source: string;
    sourceLayer: string;
    sourceObjectId: number;
    method: string;
  };
  parcelIdentity?: { sourceLayer: string; sourceObjectId: number };
}
export interface OfficialLocation extends LocationResult {
  aliases: string[];
  canonicalName?: string;
  namedType?: LocationType;
  type: LocationType;
  normalizedName: string;
  supported: boolean;
  provenance: LocationProvenance[];
}
export interface SourceInventory {
  id: string;
  fetchedAt: string;
  expiresAt?: number;
  records: OfficialLocation[];
  rawCount: number;
  rejected: { objectId: unknown; name: string; reason: string }[];
}
export interface CatalogDiagnostic {
  source: string;
  status: "available" | "unavailable";
  message?: string;
  fetchedAt?: string;
  rawCount?: number;
}
export interface UnifiedCatalog {
  records: OfficialLocation[];
  diagnostics: CatalogDiagnostic[];
  inventories: SourceInventory[];
  duplicatesRemoved: number;
  version: string;
}
export const CITY_GIS_BASE =
  "https://gis.bentonvillear.com/arcgis/rest/services/";
export const sourceUrl = (source: LocationSource) =>
  source.path.startsWith("https://")
    ? source.path
    : CITY_GIS_BASE + source.path + "/" + source.layer;
