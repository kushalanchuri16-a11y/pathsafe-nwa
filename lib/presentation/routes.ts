import type { RouteCandidate } from "@/types/routes";
export function routeDisplayName(route: RouteCandidate) {
  return route.recommended && route.source === "live" && route.id !== "fastest"
    ? "PathSafe Route"
    : route.name;
}
