import { measureCoverage } from "@/lib/analysis/coverage";
import { routeLengthMeters } from "@/lib/analysis/geometry";
import type { RouteCandidate } from "@/types/routes";
// Equivalent if lengths are within 2% and >=98% of each is within 5m of the other.
// Bidirectional testing catches a short route being a subset of a longer one.
export function geometricallyEquivalent(a: RouteCandidate, b: RouteCandidate) {
  const la = routeLengthMeters(a.geometry),
    lb = routeLengthMeters(b.geometry);
  if (Math.abs(la - lb) / Math.max(la, lb) > 0.02) return false;
  return (
    measureCoverage(a.geometry, [{ geometry: b.geometry, eligible: true }], 5)
      .coverage >= 98 &&
    measureCoverage(b.geometry, [{ geometry: a.geometry, eligible: true }], 5)
      .coverage >= 98
  );
}
export function deduplicateRoutes(routes: RouteCandidate[]) {
  const result: RouteCandidate[] = [];
  for (const route of routes)
    if (!result.some((r) => geometricallyEquivalent(route, r)))
      result.push(route);
  return result;
}
