import { ArrowUpRight, Check } from "lucide-react";
import type { RouteComparison } from "@/types/routes";
import { recommendationStory } from "@/lib/presentation/recommendation";
export default function RecommendationPanel({
  comparison,
}: {
  comparison: RouteComparison;
}) {
  const story = recommendationStory(comparison);
  return (
    <section className="recommendation" aria-label="Route recommendation">
      <div className="recommendation-eyebrow">
        <ArrowUpRight size={17} />
        {comparison.source === "mock"
          ? "ILLUSTRATIVE COMPARISON"
          : comparison.routes.length === 1
            ? "ONE ROUTE AVAILABLE"
            : "THE ROUTE TRADEOFF"}
      </div>
      <h3>
        {comparison.routes.length === 1
          ? "One route available"
          : story.headline}
      </h3>
      <details className="recommendation-reason">
        <summary>
          {comparison.routes.length === 1
            ? "About this route"
            : "Why is this route recommended?"}
        </summary>
        <p>{story.explanation}</p>
        <ul>
          {story.factors.map((f) => (
            <li key={f}>
              <Check size={13} aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
