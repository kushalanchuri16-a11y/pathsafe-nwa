"use client";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { RouteComparison, RouteCandidate } from "@/types/routes";
import { routeDisplayName } from "@/lib/presentation/routes";
import { useEffect } from "react";
import type { LeafletEvent } from "leaflet";
function namedTooltip(label: string) {
  return {
    add: (event: LeafletEvent) => {
      event.target.getElement()?.setAttribute("aria-label", label);
    },
  };
}
import { LocateFixed } from "lucide-react";
function ResetView({ comparison }: { comparison: RouteComparison | null }) {
  const map = useMap();
  function fit() {
    if (comparison)
      map.fitBounds(
        [
          ...comparison.routes.flatMap((r) => r.geometry),
          comparison.start.point,
          comparison.destination.point,
        ],
        { paddingTopLeft: [70, 90], paddingBottomRight: [70, 80], maxZoom: 15 },
      );
    else map.setView([36.3626, -94.211], 14);
  }
  useEffect(() => {
    if (comparison)
      map.fitBounds(
        [
          ...comparison.routes.flatMap((r) => r.geometry),
          comparison.start.point,
          comparison.destination.point,
        ],
        { paddingTopLeft: [70, 90], paddingBottomRight: [70, 80], maxZoom: 15 },
      );
  }, [comparison, map]);
  return (
    <button
      className="map-reset"
      aria-label="Recenter map on Bentonville"
      onClick={fit}
    >
      <LocateFixed size={19} />
    </button>
  );
}
export default function MapCanvas({
  comparison,
  selected,
  locations,
}: {
  comparison: RouteComparison | null;
  selected: RouteCandidate["id"];
  locations?: {
    start?: { label: string; point: import("@/types/routes").Coordinate };
    destination?: { label: string; point: import("@/types/routes").Coordinate };
  };
}) {
  return (
    <MapContainer
      center={[36.3626, -94.211]}
      zoom={14}
      zoomSnap={0.25}
      scrollWheelZoom={false}
      className="leaflet-map"
      aria-label={`Interactive Bentonville map${comparison ? (comparison.source === "live" ? " with real walking routes and City GIS infrastructure" : " with illustrative mock routes") : ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {comparison?.infrastructure.map((s) => (
        <Polyline
          key={s.id}
          positions={s.geometry}
          pathOptions={{
            color: "#82a99b",
            weight: comparison?.source === "live" ? 2 : 10,
            opacity: s.eligible === false ? 0.25 : 0.45,
            dashArray: s.eligible === false ? "2 6" : undefined,
          }}
        >
          <Tooltip>
            {s.source === "live"
              ? `City GIS · ${s.kind}${s.eligible === false ? " · excluded from coverage" : ""}`
              : "Illustrative infrastructure — MOCK"}
          </Tooltip>
        </Polyline>
      ))}
      {comparison &&
        [...comparison.routes]
          .sort((a, b) => Number(a.id === selected) - Number(b.id === selected))
          .map((r) => (
            <Polyline
              key={r.id}
              positions={r.geometry}
              pathOptions={{
                color:
                  r.id === "fastest"
                    ? "#64748b"
                    : r.id === "pathsafe"
                      ? "#19664f"
                      : "#1c707e",
                weight: r.id === selected ? 7 : 4,
                opacity: r.id === selected ? 1 : 0.55,
                dashArray:
                  r.id === "fastest"
                    ? "9 7"
                    : r.id === "pathsafe"
                      ? undefined
                      : "3 6",
              }}
            >
              <Tooltip>
                {routeDisplayName(r)} ·{" "}
                {comparison.source === "live"
                  ? "Valhalla pedestrian route"
                  : "MOCK geometry"}
              </Tooltip>
            </Polyline>
          ))}
      {comparison && (
        <>
          <CircleMarker
            center={comparison.start.point}
            radius={8}
            pathOptions={{
              color: "#fff",
              weight: 3,
              fillColor: "#243e35",
              fillOpacity: 1,
            }}
          >
            <Tooltip permanent direction="auto">
              Start · {comparison.start.label}
            </Tooltip>
          </CircleMarker>
          <CircleMarker
            center={comparison.destination.point}
            radius={8}
            pathOptions={{
              color: "#fff",
              weight: 3,
              fillColor: "#19664f",
              fillOpacity: 1,
            }}
          >
            <Tooltip
              permanent
              direction={comparison.source === "live" ? "auto" : "top"}
            >
              Destination · {comparison.destination.label}
            </Tooltip>
          </CircleMarker>
        </>
      )}
      {!comparison && locations && (
        <>
          {locations.start && (
            <CircleMarker center={locations.start.point} radius={8}>
              <Tooltip permanent eventHandlers={namedTooltip("Start location")}>
                Start · {locations.start.label}
              </Tooltip>
            </CircleMarker>
          )}
          {locations.destination && (
            <CircleMarker center={locations.destination.point} radius={8}>
              <Tooltip
                permanent
                eventHandlers={namedTooltip("Destination location")}
              >
                Destination · {locations.destination.label}
              </Tooltip>
            </CircleMarker>
          )}
          <SelectionView locations={locations} />
        </>
      )}
      <ResetView comparison={comparison} />
    </MapContainer>
  );
}

function SelectionView({
  locations,
}: {
  locations: {
    start?: { point: import("@/types/routes").Coordinate };
    destination?: { point: import("@/types/routes").Coordinate };
  };
}) {
  const map = useMap();
  useEffect(() => {
    const points = [
      locations.start?.point,
      locations.destination?.point,
    ].filter((p): p is import("@/types/routes").Coordinate => !!p);
    if (points.length === 2)
      map.fitBounds(points, { padding: [60, 80], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 15);
  }, [locations.start, locations.destination, map]);
  return null;
}
