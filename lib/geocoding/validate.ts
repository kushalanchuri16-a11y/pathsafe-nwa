import { demoLocations, isDemoPair } from "@/data/demoLocations";
import type { Coordinate } from "@/types/routes";
import { isWithinSupportedArea } from "./area";
import { AREA_MESSAGE, LocationError } from "./provider";
import { coordinateDistance } from "@/lib/analysis/geometry";
export type SelectedLocation = { label: string; point: Coordinate };
export function validateSelection(raw: unknown): SelectedLocation {
  const p = raw as Partial<SelectedLocation> | null;
  if (
    !p ||
    typeof p.label !== "string" ||
    !p.label.trim() ||
    p.label.length > 160 ||
    !Array.isArray(p.point) ||
    p.point.length !== 2 ||
    !p.point.every((n) => typeof n === "number" && Number.isFinite(n))
  )
    throw new LocationError("Choose a location from the search suggestions.");
  if (!isWithinSupportedArea(p.point[0], p.point[1]))
    throw new LocationError(AREA_MESSAGE);
  return { label: p.label.trim(), point: p.point as Coordinate };
}
export function validateTrip(start: unknown, destination: unknown) {
  if (
    typeof start === "string" &&
    typeof destination === "string" &&
    isDemoPair(start, destination)
  )
    return {
      start: demoLocations.start,
      destination: demoLocations.destination,
    };
  const a = validateSelection(start),
    b = validateSelection(destination);
  if (coordinateDistance(a.point, b.point) < 20)
    throw new LocationError(
      "Choose a destination at least 20 meters from your starting point.",
    );
  return { start: a, destination: b };
}
