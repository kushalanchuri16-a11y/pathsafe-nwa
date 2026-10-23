"use client";
import { routeDisplayName } from "@/lib/presentation/routes";
import dynamic from "next/dynamic";
import type { RouteComparison, RouteCandidate } from "@/types/routes";
const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading Bentonville map…</div>,
});
export default function RouteMap({
  comparison,
  selected = "pathsafe",
  preview = false,
  locations,
}: {
  comparison: RouteComparison | null;
  selected?: RouteCandidate["id"];
  preview?: boolean;
  locations?: {
    start?: { label: string; point: import("@/types/routes").Coordinate };
    destination?: { label: string; point: import("@/types/routes").Coordinate };
  };
}) {
  return (
    <div className={`map-shell ${preview ? "preview-map" : ""}`}>
      <MapCanvas
        comparison={comparison}
        selected={selected}
        locations={locations}
      />
      <div className="map-caption">
        <span className="live-dot" /> BENTONVILLE, AR{" "}
        <span>
          {comparison?.source === "live"
            ? "Pedestrian infrastructure data: City of Bentonville GIS"
            : comparison
              ? "Illustrative routes · MOCK DATA"
              : "Compare routes to load analysis"}
        </span>
      </div>
      {!preview && (
        <div className="map-legend" aria-label="Map legend">
          <strong>
            Map key{" "}
            <span>
              {comparison?.source === "live"
                ? "CITY GIS + VALHALLA"
                : comparison
                  ? "MOCK"
                  : "WALKING"}
            </span>
          </strong>
          {comparison?.routes.map((r) => (
            <div key={r.id}>
              <i
                className={`route-line ${r.id === "fastest" ? "fastest" : "pathsafe"} ${r.id}`}
              />
              {routeDisplayName(r)}
            </div>
          ))}
          <div>
            <i className="route-line infrastructure" />
            Eligible mapped pedestrian infrastructure
          </div>
          {comparison?.source === "live" && (
            <div>
              <i className="route-line excluded" />
              Other mapped facilities (excluded)
            </div>
          )}
          <div>
            <i className="legend-point" />
            Start <i className="legend-point destination" />
            Destination
          </div>
        </div>
      )}
    </div>
  );
}
