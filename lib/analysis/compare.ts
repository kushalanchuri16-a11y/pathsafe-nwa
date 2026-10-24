import type { RouteComparison, RouteCandidate } from "@/types/routes";
import { demoLocations } from "@/data/demoLocations";
import { getRouteInventory } from "@/lib/gis/routeInventory";
import { validateTrip } from "@/lib/geocoding/validate";
import { supportedCandidates } from "@/lib/geocoding/supportedRoutes";
import { RoutingConfigurationError } from "@/lib/config";
import { AnalysisUnavailableError } from "@/lib/server/analysisError";
import { LocationError } from "@/lib/geocoding/provider";
import { measureCoverage, TOLERANCE_METERS, MIN_GAP_METERS } from "./coverage";
import {
  BENTONVILLE_LAYER,
  type InfrastructureDataset,
} from "@/lib/gis/bentonville";
import { PARKS_TRAIL_LAYER } from "@/lib/gis/pedestrianInventory";
import { walkingRoutingProvider } from "@/lib/routing";
import { pathsafeScore, SCORE_VERSION } from "@/lib/scoring/pathsafeScore";
import { recommendRoute } from "@/lib/scoring/recommendation";
export function analyzeCandidates(
  candidates: RouteCandidate[],
  dataset: InfrastructureDataset,
) {
  const shortest = Math.min(
    ...candidates.map((r) => measureCoverage(r.geometry, []).lengthMeters),
  );
  const routes = candidates.map((route) => {
    const measured = measureCoverage(route.geometry, dataset.segments);
    return {
      ...route,
      metrics: {
        ...route.metrics,
        lengthMeters: measured.lengthMeters,
        coveredMeters: measured.coveredMeters,
        uncoveredMeters: measured.uncoveredMeters,
        coverage: measured.coverage,
        gaps: measured.gaps,
        score: pathsafeScore({ ...measured, shortestMeters: shortest }),
      },
    };
  });
  const recommendation = recommendRoute(routes);
  for (const route of routes)
    route.recommended =
      routes.length > 1 && route.id === recommendation.routeId;
  return { routes, recommendation };
}
export async function getLiveRouteComparison(
  input: {
    start: { label: string; point: import("@/types/routes").Coordinate };
    destination: { label: string; point: import("@/types/routes").Coordinate };
  } = { start: demoLocations.start, destination: demoLocations.destination },
  dependencies = {
    routing: walkingRoutingProvider,
    inventory: getRouteInventory,
  },
): Promise<RouteComparison> {
  const trip = validateTrip(input.start, input.destination);
  let routing: Awaited<ReturnType<typeof walkingRoutingProvider.getCandidates>>;
  try {
    routing = await dependencies.routing.getCandidates({
      start: trip.start.point,
      destination: trip.destination.point,
    });
  } catch (error) {
    if (error instanceof RoutingConfigurationError) throw error;
    if (error instanceof Error && /no walking route/.test(error.message))
      throw new LocationError(
        "No walking route was found between these locations. Try different locations.",
      );
    if (error instanceof Error && /snapped more than 100m/.test(error.message))
      throw new AnalysisUnavailableError(
        "The walking provider could not connect a selected location to its walking network within 100 meters. Try a nearby public entrance. No route was substituted.",
      );
    throw new AnalysisUnavailableError(
      "Live route analysis is temporarily unavailable. Walking routing failed or timed out. Please try again.",
    );
  }
  if (!routing.result.routes.length)
    throw new LocationError(
      "No walking route was found between these locations.",
    );
  const supported = supportedCandidates(routing.result.routes);
  let inventory: Awaited<ReturnType<typeof getRouteInventory>>;
  try {
    inventory = await dependencies.inventory(
      supported.routes.map((r) => r.geometry),
    );
  } catch {
    throw new AnalysisUnavailableError(
      "Live route analysis is temporarily unavailable. City infrastructure data could not be loaded. Please try again.",
    );
  }
  const { routes, recommendation } = analyzeCandidates(
    supported.routes,
    inventory.dataset,
  );
  return {
    source: "live",
    start: {
      label: trip.start.label,
      point: trip.start.point,
    },
    destination: {
      label: trip.destination.label,
      point: trip.destination.point,
    },
    routes,
    infrastructure: inventory.dataset.segments,
    recommendation,
    provenance: {
      gisEndpoint: BENTONVILLE_LAYER,
      gisSources: [
        {
          endpoint: BENTONVILLE_LAYER,
          fetchedAt: inventory.sidewalks.fetchedAt,
          cacheHit: inventory.sidewalks.cacheHit,
          featureCount: inventory.sidewalks.value.featureCount,
        },
        {
          endpoint: PARKS_TRAIL_LAYER,
          fetchedAt: inventory.trails.fetchedAt,
          cacheHit: inventory.trails.cacheHit,
          featureCount: inventory.trails.value.featureCount,
        },
      ],
      gisFetchedAt: inventory.sidewalks.fetchedAt,
      routingFetchedAt: routing.fetchedAt,
      gisCacheHit: inventory.sidewalks.cacheHit && inventory.trails.cacheHit,
      routingCacheHit: routing.cacheHit,
      featureCount: inventory.dataset.featureCount,
      segmentCount: inventory.dataset.segments.length,
      eligibleSegmentCount: inventory.dataset.segments.filter((s) => s.eligible)
        .length,
      countsByKind: inventory.dataset.countsByKind,
      toleranceMeters: TOLERANCE_METERS,
      gapThresholdMeters: MIN_GAP_METERS,
      algorithm: SCORE_VERSION,
      candidatesReceived: routing.result.received,
      candidatesRetained: routes.length,
      routingEndpoint: routing.result.endpoint,
      warnings: [
        ...routing.result.warnings,
        ...(supported.excluded
          ? [
              `${supported.excluded} provider alternative(s) excluded because they leave official Bentonville City Limits. Fastest means the fastest retained route wholly within the supported area.`,
            ]
          : []),
        ...inventory.dataset.warnings,
        "Proximity to a mapped facility does not establish a connected or usable walking path. City points are campus/building locations; provider endpoints may snap to the walking network.",
      ],
    },
  };
}
