import type { Recommendation, RouteCandidate } from "@/types/routes";
export const RECOMMENDATION_RULE = {
  minimumCoverageGain: 10,
  maxAddedMinutes: 5,
  maxTimeRatio: 1.25,
  maxDistanceRatio: 1.25,
};
export function recommendRoute(routes: RouteCandidate[]): Recommendation {
  if (!routes.length) throw new Error("No candidates to recommend.");
  const fastest = [...routes].sort(
    (a, b) =>
      (a.metrics.seconds ?? a.metrics.minutes * 60) -
      (b.metrics.seconds ?? b.metrics.minutes * 60),
  )[0];
  if (routes.length === 1)
    return {
      routeId: fastest.id,
      explanation:
        "Only one distinct walking route was returned. No alternative comparison is available; this route is shown without a comparative infrastructure recommendation.",
      factors: ["One provider route; no fabricated alternative"],
    };
  const base = fastest.metrics,
    baseSeconds = base.seconds ?? base.minutes * 60,
    baseLength = base.providerDistanceMeters ?? base.miles * 1609.344;
  const candidates = routes.filter(
    (r) =>
      r.id !== fastest.id &&
      r.metrics.coverage - base.coverage >= 10 &&
      (r.metrics.seconds ?? r.metrics.minutes * 60) - baseSeconds <= 300 &&
      (r.metrics.seconds ?? r.metrics.minutes * 60) <= baseSeconds * 1.25 &&
      (r.metrics.providerDistanceMeters ?? r.metrics.miles * 1609.344) <=
        baseLength * 1.25 &&
      r.metrics.score > base.score,
  );
  const best = candidates.sort(
    (a, b) =>
      b.metrics.score - a.metrics.score ||
      (a.metrics.seconds ?? a.metrics.minutes * 60) -
        (b.metrics.seconds ?? b.metrics.minutes * 60),
  )[0];
  if (best) {
    const added =
      ((best.metrics.seconds ?? best.metrics.minutes * 60) - baseSeconds) / 60;
    return {
      routeId: best.id,
      explanation: `This route adds approximately ${added.toFixed(1)} minutes and increases mapped pedestrian infrastructure coverage from ${base.coverage.toFixed(1)}% to ${best.metrics.coverage.toFixed(1)}%.`,
      factors: [
        "At least 10 percentage points more mapped infrastructure coverage",
        "At most 5 extra minutes and 25% added time/distance",
        "Higher Pedestrian Infrastructure Score than the fastest route",
      ],
    };
  }
  const similar = routes.every(
    (r) => Math.abs(r.metrics.coverage - base.coverage) < 10,
  );
  return {
    routeId: fastest.id,
    explanation: similar
      ? `${routes.length === 2 ? "Both routes have" : "The routes have"} similar mapped pedestrian infrastructure coverage. The faster route is recommended.`
      : "The fastest route is recommended. No alternative meets both the infrastructure improvement and travel-cost thresholds.",
    factors: [
      "Keep added walking time and distance proportionate",
      "No qualifying coverage gain of at least 10 percentage points within the tradeoff limits",
    ],
  };
}
