"use client";
import { useEffect, useState } from "react";
import { getRouteComparison } from "@/lib/routes";
import type { RouteComparison } from "@/types/routes";
import RouteMap from "./RouteMap";
export default function ProductPreview() {
  const [data, setData] = useState<RouteComparison | null>(null);
  useEffect(() => {
    getRouteComparison({
      source: "mock",
      start: "Austin-Baggett Park",
      destination: "Lawrence Plaza",
    }).then(setData);
  }, []);
  return (
    <div className="product-preview">
      <div className="preview-bar">
        <span>
          <span className="live-dot" /> A better-informed walk
        </span>
        <span className="mock-label">MOCK DATA</span>
      </div>
      <div className="preview-trip">
        <span>Austin-Baggett Park</span>
        <span aria-hidden="true">→</span>
        <span>Lawrence Plaza</span>
      </div>
      <RouteMap comparison={data} preview />
      <div className="preview-results">
        {data?.routes.map((r) => (
          <div
            key={r.id}
            className={r.recommended ? "preview-recommended" : ""}
          >
            <span>
              <i className={`route-line ${r.id}`} />
              {r.name}
            </span>
            <strong>
              {r.metrics.minutes} <small>min</small>
              <em>{r.metrics.miles} mi</em>
            </strong>
            <p>
              <b>{r.metrics.coverage}%</b> mapped sidewalk/trail coverage
            </p>
            <div className="route-coverage-track" aria-hidden="true">
              <span style={{ width: `${r.metrics.coverage}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="preview-note">
        Illustrative preview · Open the app to compare real walking routes.
      </div>
    </div>
  );
}
