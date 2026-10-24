import type { Coordinate } from "@/types/routes";
export interface LocationResult {
  id: string;
  label: string;
  point: Coordinate;
  address?: string;
  kind: "place" | "address";
  attribution: string;
  aliases?: string[];
  type?: import("./catalog/model").LocationType;
}
export interface GeocodingProvider {
  search(query: string): Promise<LocationResult[]>;
}
export const AREA_MESSAGE =
  "PathSafe currently supports locations within Bentonville, Arkansas.";
export class LocationError extends Error {}
