import { Check, Clock3, Footprints } from "lucide-react";
import type { RouteCandidate } from "@/types/routes";
import { routeDisplayName } from "@/lib/presentation/routes";
import Score from "./Score";
export default function RouteCard({
  route,
  selected,
  onSelect,
}: {
  route: RouteCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  const m = route.metrics;
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`route-card ${selected ? "selected" : ""} ${route.id}`}
      onClick={onSelect}
    >
      <div className="route-heading">
        <span>
          <i
            className={`route-line ${route.id === "fastest" ? "fastest" : "pathsafe"} ${route.id}`}
          />
          {routeDisplayName(route)}
        </span>
        {route.recommended && (
          <span className="recommended">
            <Check size={12} /> Recommended
          </span>
        )}
      </div>
      <div className="route-stats">
        <strong>
          {route.source === "live" ? m.minutes.toFixed(2) : m.minutes}
          <small>min</small>
        </strong>
        <span>
          <Footprints size={15} />
          {route.source === "live" ? m.miles.toFixed(2) : m.miles} mi
        </span>
        <Clock3 size={16} />
      </div>
      <div className="coverage">
        <strong>
          {route.source === "live" ? m.coverage.toFixed(2) : m.coverage}%
        </strong>{" "}
        mapped pedestrian infrastructure coverage
      </div>
      <div className="route-coverage-track" aria-hidden="true">
        <span style={{ width: `${m.coverage}%` }} />
      </div>
      <div className="gaps">
        {m.gaps
          ? `${m.gaps} meaningful mapped-coverage gaps`
          : route.source === "live"
            ? "0 meaningful mapped-coverage gaps"
            : "0 major mapped gaps"}
      </div>
      {route.source === "live" && (
        <p className="measurement-detail">
          {Math.round(m.coveredMeters ?? 0).toLocaleString()}m near eligible
          facilities · {Math.round(m.uncoveredMeters ?? 0).toLocaleString()}m
          uncovered
        </p>
      )}
      <Score value={m.score} mock={route.source !== "live"} />
    </button>
  );
}
