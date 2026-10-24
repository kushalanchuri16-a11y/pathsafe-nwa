import { lineWithinArea } from "./area";
import type { RouteCandidate } from "@/types/routes";
export class RouteBoundaryError extends Error {}
// Endpoints remain strictly validated separately. One unsupported alternative
// must not suppress other wholly supported Bentonville walking routes.
export function supportedCandidates(candidates: RouteCandidate[]) {
  const inside = candidates.filter((r) => lineWithinArea(r.geometry));
  if (!inside.length)
    throw new RouteBoundaryError(
      "No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.",
    );
  const routes = inside.map((r, i) => ({
    ...r,
    id: i === 0 ? "fastest" : i === 1 ? "pathsafe" : `alternative-${i}`,
    name: i === 0 ? "Fastest Route" : `Alternative ${i}`,
    recommended: false,
  }));
  return { routes, excluded: candidates.length - inside.length };
}
