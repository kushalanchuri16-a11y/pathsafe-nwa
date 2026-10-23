import type { Coordinate, RouteCandidate } from "@/types/routes";
export interface WalkingRouteRequest {
  start: Coordinate;
  destination: Coordinate;
}
export interface WalkingRouteResult {
  routes: RouteCandidate[];
  received: number;
  warnings: string[];
  endpoint: string;
}
export interface WalkingRoutingProvider {
  getCandidates(
    request: WalkingRouteRequest,
  ): Promise<{
    result: WalkingRouteResult;
    fetchedAt: string;
    cacheHit: boolean;
  }>;
}
