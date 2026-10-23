import { mockComparison } from "@/data/mockRoutes";
import { demoLocations, isDemoPair } from "@/data/demoLocations";
import type { DemoScenario, DataSource, RouteComparison } from "@/types/routes";
export interface ComparisonRequest {
  start: string;
  destination: string;
  startLocation?: import("@/lib/geocoding/validate").SelectedLocation | null;
  destinationLocation?:
    import("@/lib/geocoding/validate").SelectedLocation | null;
  scenario?: DemoScenario;
  source?: DataSource;
}
export async function getRouteComparison({
  start,
  destination,
  scenario = "success",
  source = "live",
  startLocation,
  destinationLocation,
}: ComparisonRequest): Promise<RouteComparison | null> {
  if (!start.trim() || !destination.trim())
    throw new Error("Choose both a starting point and a destination.");
  if (source === "mock") {
    if (!isDemoPair(start, destination)) return null;
    if (scenario === "error")
      throw new Error(
        "The demo comparison could not be loaded. Please try again.",
      );
    if (scenario === "no-route") return null;
    const result = structuredClone(mockComparison);
    result.recommendation = {
      routeId: "pathsafe",
      explanation:
        "This illustrative route adds approximately 6 seconds and increases illustrative mapped infrastructure coverage from 75% to 96%.",
      factors: [
        "Mock higher sidewalk/trail coverage",
        "Mock additional mapped pedestrian facilities",
        "Slightly longer illustrative travel time",
      ],
    };
    return result;
  }
  const a =
      startLocation === undefined
        ? start === demoLocations.start.label
          ? demoLocations.start
          : null
        : startLocation,
    b =
      destinationLocation === undefined
        ? destination === demoLocations.destination.label
          ? demoLocations.destination
          : null
        : destinationLocation;
  if (!a || !b || a.label !== start || b.label !== destination)
    throw new Error("Choose both locations from the search suggestions.");
  // Server-side data clients never enter the browser bundle.
  const response = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: { label: a.label, point: a.point },
      destination: { label: b.label, point: b.point },
    }),
    signal: AbortSignal.timeout(60000),
  }).catch(() => {
    throw new Error(
      "Live route analysis is temporarily unavailable. The analysis request failed or timed out.",
    );
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error ?? "Live route analysis is temporarily unavailable.",
    );
  return body.comparison as RouteComparison;
}
