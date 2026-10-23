import type { Coordinate } from "@/types/routes";
// Verified through official REST GeoJSON, not geocoded or inferred from Phase 1 mock points.
// Evidence: data/demo-search/verified-pairs.json (pair-20); verified 2026-10-23.
export const LOCATION_SOURCE =
  "https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/194";
export const demoLocations = {
  start: {
    label: "Austin-Baggett Park",
    point: [36.36571210106438, -94.20363133075323] as Coordinate,
    objectId: 5,
    officialName: "Austin-Baggett Park",
    address: "601 SE D ST",
  },
  destination: {
    label: "Lawrence Plaza",
    point: [36.374649832783945, -94.20753355872435] as Coordinate,
    objectId: 67,
    officialName: "Lawrence Plaza",
    address: "214 NE A ST",
  },
};
// City facility points are not independently verified pedestrian entrances.
export function isDemoPair(start: string, destination: string) {
  return (
    start.trim().toLowerCase() === demoLocations.start.label.toLowerCase() &&
    destination.trim().toLowerCase() ===
      demoLocations.destination.label.toLowerCase()
  );
}
