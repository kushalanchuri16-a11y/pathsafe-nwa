import type { RouteComparison } from "@/types/routes";
export function addedTimeLabel(seconds: number) {
  const value = Math.max(0, seconds);
  if (value < 60) {
    const rounded = Math.round(value);
    return `${rounded} ${rounded === 1 ? "second" : "seconds"}`;
  }
  return `${(value / 60).toFixed(1)} minutes`;
}
// Presentation only: derive the story from the existing recommendation and live metrics.
// This does not change ranking, scoring, or any threshold.
export function recommendationStory(comparison: RouteComparison) {
  const selected = comparison.routes.find(
    (r) => r.id === comparison.recommendation?.routeId,
  );
  const fastest = [...comparison.routes].sort(
    (a, b) =>
      (a.metrics.seconds ?? a.metrics.minutes * 60) -
      (b.metrics.seconds ?? b.metrics.minutes * 60),
  )[0];
  const fallback = {
    headline:
      comparison.routes.length === 1
        ? "One walking route available."
        : selected?.id === fastest?.id
          ? "A more direct walk, with comparable coverage."
          : "See the tradeoff along your walk.",
    explanation:
      comparison.recommendation?.explanation ??
      "Select a route to explore its mapped infrastructure coverage.",
    factors: comparison.recommendation?.factors ?? [],
  };
  if (
    !selected ||
    !fastest ||
    selected.id === fastest.id ||
    comparison.source !== "live"
  )
    return {
      ...fallback,
      headline:
        selected?.id === fastest?.id &&
        comparison.routes.some(
          (r) => Math.abs(r.metrics.coverage - fastest.metrics.coverage) >= 10,
        )
          ? "The faster route meets the travel tradeoff."
          : fallback.headline,
    };
  const gain = selected.metrics.coverage - fastest.metrics.coverage,
    added =
      (selected.metrics.seconds ?? selected.metrics.minutes * 60) -
      (fastest.metrics.seconds ?? fastest.metrics.minutes * 60);
  const rounded = Math.ceil(gain),
    gainLabel =
      rounded - gain > 0 && rounded - gain < 0.1
        ? `nearly ${rounded}`
        : gain > Math.floor(gain) && gain >= 20
          ? `over ${Math.floor(gain)}`
          : gain.toFixed(1);
  const factors: string[] = [];
  if (gain > 0)
    factors.push("Higher mapped pedestrian infrastructure coverage");
  if (selected.metrics.gaps < fastest.metrics.gaps)
    factors.push("Fewer meaningful infrastructure gaps");
  factors.push(
    added < 60
      ? "Minimal additional travel time"
      : "Additional walking time within the travel limits",
  );
  return {
    headline: `About ${addedTimeLabel(added)} longer for ${gainLabel} percentage points more mapped pedestrian infrastructure coverage.`,
    explanation: `This route adds about ${addedTimeLabel(added)} while increasing mapped pedestrian infrastructure coverage from ${fastest.metrics.coverage.toFixed(1)}% to ${selected.metrics.coverage.toFixed(1)}%.`,
    factors,
  };
}
