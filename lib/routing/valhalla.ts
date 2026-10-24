import type { Coordinate, RouteCandidate } from "@/types/routes";
import {
  validLine,
  routeLengthMeters,
  coordinateDistance,
} from "@/lib/analysis/geometry";
import type { Fetcher } from "@/lib/server/http";
import { fetchRoutingJson } from "./transport";
import { resolveRoutingConfiguration } from "./config";
import { RoutingProviderError } from "./errors";
import { stadiaGeoJSON } from "./stadia";
import { cached } from "@/lib/server/cache";
import { deduplicateRoutes } from "./deduplicate";
import type {
  WalkingRouteRequest,
  WalkingRouteResult,
  WalkingRoutingProvider,
} from "./provider";
import {
  PUBLIC_VALHALLA_ENDPOINT,
  resolveRoutingEndpoint,
  publicRoutingEndpoint,
} from "@/lib/config";
export { PUBLIC_VALHALLA_ENDPOINT } from "@/lib/config";
export const routingEndpoint = resolveRoutingEndpoint;
export function parseValhalla(
  body: unknown,
  endpoint: string,
): WalkingRouteResult {
  const data = body as {
    code?: string;
    routes?: {
      geometry?: { type?: string; coordinates?: unknown };
      distance?: number;
      duration?: number;
      weight_name?: string;
    }[];
  };
  if (!data || typeof data !== "object")
    throw new Error("Invalid walking routing response.");
  if (data.code === "NoRoute" || data.code === "NoSegment")
    throw new Error("Routing provider returned no walking route.");
  if (data.code !== "Ok" || !Array.isArray(data.routes))
    throw new Error("Invalid walking routing response.");
  if (!data.routes.length)
    throw new Error("Routing provider returned no walking route.");
  if (data.routes.length > 3) throw new Error("Unexpected route count.");
  const routes: RouteCandidate[] = data.routes.map((r, i) => {
    if (
      r.geometry?.type !== "LineString" ||
      !Array.isArray(r.geometry.coordinates)
    )
      throw new Error("Invalid routing geometry.");
    const geometry = r.geometry.coordinates.map((p: unknown) =>
      Array.isArray(p) && p.length === 2 ? [p[1], p[0]] : null,
    ) as Coordinate[];
    if (
      !validLine(geometry) ||
      !Number.isFinite(r.duration) ||
      !Number.isFinite(r.distance) ||
      r.duration! <= 0 ||
      r.distance! <= 0 ||
      r.weight_name !== "pedestrian"
    )
      throw new Error("Invalid pedestrian route response.");
    const measured = routeLengthMeters(geometry);
    if (Math.abs(measured - r.distance!) / r.distance! > 0.1)
      throw new Error(
        "Route geometry length disagrees with provider distance.",
      );
    return {
      id: `candidate-${i}`,
      name: `Walking candidate ${i + 1}`,
      source: "live",
      recommended: false,
      geometry,
      metrics: {
        minutes: r.duration! / 60,
        miles: r.distance! / 1609.344,
        seconds: r.duration,
        providerDistanceMeters: r.distance,
        coverage: 0,
        gaps: 0,
        score: 0,
      },
    };
  });
  const unique = deduplicateRoutes(routes).sort(
    (a, b) => a.metrics.seconds! - b.metrics.seconds!,
  );
  unique.forEach((r, i) => {
    r.id = i === 0 ? "fastest" : i === 1 ? "pathsafe" : `alternative-${i}`;
    r.name = i === 0 ? "Fastest Route" : `Alternative ${i}`;
  });
  return {
    routes: unique,
    received: routes.length,
    endpoint: publicRoutingEndpoint(endpoint),
    warnings:
      unique.length < 2
        ? [
            "No distinct alternative was returned after geometric deduplication.",
          ]
        : [],
  };
}
export async function fetchValhalla(
  request: WalkingRouteRequest,
  fetcher: Fetcher = fetch,
  endpoint = PUBLIC_VALHALLA_ENDPOINT,
  apiKey?: string,
) {
  const url = new URL(endpoint);
  url.searchParams.set(
    "json",
    JSON.stringify({
      locations: [request.start, request.destination].map(([lat, lon]) => ({
        lat,
        lon,
      })),
      costing: "pedestrian",
      alternates: 2,
      units: "kilometers",
      format: "osrm",
      shape_format: apiKey ? "polyline6" : "geojson",
      directions_type: "none",
    }),
  );
  const body = await fetchRoutingJson(url, fetcher, apiKey);
  let result: WalkingRouteResult;
  try {
    result = parseValhalla(apiKey ? stadiaGeoJSON(body) : body, endpoint);
  } catch (error) {
    throw new RoutingProviderError(
      error instanceof Error &&
        error.message === "Routing provider returned no walking route."
        ? "ROUTING_NO_ROUTE"
        : "ROUTING_MALFORMED_RESPONSE",
    );
  }
  for (const route of result.routes) {
    const endpoints = [route.geometry[0], route.geometry.at(-1)!];
    for (let i = 0; i < 2; i++) {
      const requested = i === 0 ? request.start : request.destination;
      if (coordinateDistance(requested, endpoints[i]) > 100)
        throw new Error(
          "Routing endpoint snapped more than 100m from the verified location.",
        );
    }
  }
  return result;
}
export const valhallaProvider: WalkingRoutingProvider = {
  async getCandidates(request) {
    const response = await getCachedValhalla(request);
    return {
      result: response.value,
      fetchedAt: response.fetchedAt,
      cacheHit: response.cacheHit,
    };
  },
};
export function getCachedValhalla(request: WalkingRouteRequest) {
  const { provider, endpoint, apiKey } = resolveRoutingConfiguration();
  return cached(
    `valhalla-v3:${provider}:${endpoint}:${JSON.stringify(request)}`,
    6 * 60 * 60 * 1000,
    () => fetchValhalla(request, fetch, endpoint, apiKey),
  );
}
