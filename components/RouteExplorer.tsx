"use client";
import Link from "next/link";
import { useRef, useState, useEffect, useSyncExternalStore } from "react";
import {
  ArrowRight,
  Footprints,
  Info,
  LoaderCircle,
  MapPin,
  RotateCcw,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { getRouteComparison, type ComparisonRequest } from "@/lib/routes";
import type { DemoScenario, DataSource, RouteComparison } from "@/types/routes";
import { demoLocations } from "@/data/demoLocations";
import RouteMap from "./RouteMap";
import LocationSearch from "./LocationSearch";
import type { SelectedLocation } from "@/lib/geocoding/validate";
import RouteCard from "./RouteCard";
import RecommendationPanel from "./RecommendationPanel";
import DataMethodology from "./DataMethodology";
import AnalysisLoading from "./AnalysisLoading";
type Status = "initial" | "loading" | "success" | "empty" | "error";
const subscribeHydration = () => () => {};
export default function RouteExplorer() {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [start, setStart] = useState(demoLocations.start.label),
    [destination, setDestination] = useState(demoLocations.destination.label),
    [scenario, setScenario] = useState<DemoScenario>("success"),
    [source, setSource] = useState<DataSource>("live"),
    [status, setStatus] = useState<Status>("initial"),
    [comparison, setComparison] = useState<RouteComparison | null>(null),
    [selected, setSelected] = useState("fastest"),
    [error, setError] = useState("");
  const [startLocation, setStartLocation] = useState<SelectedLocation | null>(
      demoLocations.start,
    ),
    [destinationLocation, setDestinationLocation] =
      useState<SelectedLocation | null>(demoLocations.destination);
  const requestVersion = useRef(0);
  const resultsTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (status === "success") {
      resultsTitle.current?.focus({ preventScroll: true });
      resultsTitle.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    }
  }, [status]);
  useEffect(
    () => () => {
      requestVersion.current++;
    },
    [],
  );
  function reset(nextSource = source) {
    requestVersion.current++;
    setStart(demoLocations.start.label);
    setDestination(demoLocations.destination.label);
    setStartLocation(demoLocations.start);
    setDestinationLocation(demoLocations.destination);
    setSource(nextSource);
    setScenario("success");
    setComparison(null);
    setStatus("initial");
  }
  async function compare(e: React.FormEvent) {
    e.preventDefault();
    await runComparison({
      start,
      destination,
      startLocation,
      destinationLocation,
      scenario,
      source,
    });
  }
  async function runComparison(request: ComparisonRequest) {
    const version = ++requestVersion.current;
    setStatus("loading");
    setComparison(null);
    try {
      if (request.source === "mock")
        await new Promise((resolve) => setTimeout(resolve, 450));
      const result = await getRouteComparison(request);
      if (version !== requestVersion.current) return;
      setComparison(result);
      setSelected(
        result?.recommendation?.routeId ?? result?.routes[0]?.id ?? "fastest",
      );
      setStatus(result ? "success" : "empty");
    } catch (err) {
      if (version !== requestVersion.current) return;
      setError(
        err instanceof Error ? err.message : "Live route analysis unavailable.",
      );
      setStatus("error");
    }
  }
  const mock = source === "mock";
  return (
    <main id="main" className="explorer">
      <aside className="control-panel">
        <div className="panel-title">
          <span className="eyebrow">YOUR WALK, WITH MORE CONTEXT</span>
          <h1>
            Find your way.
            <br />
            <span>Know your route.</span>
          </h1>
          <p>Compare the infrastructure along your walk.</p>
        </div>
        {mock && (
          <p className="mock-mode-notice" role="status">
            MOCK DEMO · Illustrative routes and values. This is not live
            analysis.
          </p>
        )}
        <form onSubmit={compare}>
          <div className="walking-mode">
            <Footprints size={17} />
            Walking <span>{mock ? "MOCK DEMO" : "BENTONVILLE DEMO"}</span>
          </div>
          <label htmlFor="analysis-source">Analysis source</label>
          <select
            id="analysis-source"
            value={source}
            disabled={!hydrated || status === "loading"}
            onChange={(e) => reset(e.target.value as DataSource)}
          >
            <option value="live">
              Live analysis · City GIS + walking routes
            </option>
            <option value="mock">Mock demo · illustrative values</option>
          </select>
          <LocationSearch
            id="start"
            label="Starting point"
            text={start}
            selected={startLocation}
            disabled={!hydrated || status === "loading"}
            onChange={(text) => {
              setStart(text);
              setStartLocation(null);
              setComparison(null);
              setStatus("initial");
            }}
            onSelect={(location) => {
              setStart(location.label);
              setStartLocation(location);
              setComparison(null);
              setStatus("initial");
            }}
          />
          <LocationSearch
            id="destination"
            label="Destination"
            text={destination}
            selected={destinationLocation}
            disabled={!hydrated || status === "loading"}
            onChange={(text) => {
              setDestination(text);
              setDestinationLocation(null);
              setComparison(null);
              setStatus("initial");
            }}
            onSelect={(location) => {
              setDestination(location.label);
              setDestinationLocation(location);
              setComparison(null);
              setStatus("initial");
            }}
          />
          <button
            className="button compare-button"
            disabled={!hydrated || status === "loading"}
          >
            {status === "loading" ? (
              <>
                <LoaderCircle size={18} className="spin" />
                Comparing routes…
              </>
            ) : (
              <>
                Compare routes <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="form-hint">
            PathSafe currently supports walking trips within Bentonville,
            Arkansas.
          </p>
        </form>
        <div
          className="results"
          aria-live="polite"
          aria-busy={status === "loading"}
        >
          {status === "initial" && (
            <div className="empty-state">
              <div className="route-illustration">
                <MapPin size={24} />
                <span>··········</span>
                <Footprints size={24} />
              </div>
              <h2>Every walk has a few possibilities.</h2>
              <p>
                {mock
                  ? "Compare two illustrative routes from Austin-Baggett Park to Lawrence Plaza."
                  : "Search Bentonville places or addresses, select both locations, then compare walking routes against mapped City infrastructure."}
              </p>
              <span className="mock-label">
                {mock
                  ? "MOCK DATA · NO LIVE ROUTING"
                  : "CITY GIS · VALHALLA PEDESTRIAN"}
              </span>
            </div>
          )}
          {status === "loading" && <AnalysisLoading mock={mock} />}
          {status === "success" && comparison && (
            <>
              <div className="results-heading">
                <h2 ref={resultsTitle} tabIndex={-1}>
                  Your route comparison
                </h2>
                <span
                  className={`mock-label ${comparison.source === "live" ? "live-badge" : "mock-badge"}`}
                >
                  {comparison.source === "mock"
                    ? "MOCK DATA"
                    : "REAL DATA · V1"}
                </span>
              </div>
              <RecommendationPanel comparison={comparison} />
              <p className="selection-hint">
                Select a route to highlight it on the map.
              </p>
              {comparison.provenance?.eligibleSegmentCount === 0 && (
                <p className="analysis-warning" role="status">
                  No eligible mapped pedestrian infrastructure was returned near
                  these routes. Zero mapped coverage describes the dataset, not
                  confirmed route conditions.
                </p>
              )}
              {comparison.routes.slice(0, 2).map((r) => (
                <RouteCard
                  key={r.id}
                  route={r}
                  selected={selected === r.id}
                  onSelect={() => setSelected(r.id)}
                />
              ))}
              {comparison.routes.length > 2 && (
                <details className="additional-routes">
                  <summary>
                    View {comparison.routes.length - 2} more walking alternative
                    {comparison.routes.length > 3 ? "s" : ""}
                  </summary>
                  {comparison.routes.slice(2).map((r) => (
                    <RouteCard
                      key={r.id}
                      route={r}
                      selected={selected === r.id}
                      onSelect={() => setSelected(r.id)}
                    />
                  ))}
                </details>
              )}
              <details className="methodology">
                <summary>What goes into the score?</summary>
                <p>
                  {comparison.source === "mock"
                    ? "These are fixed mock scores; no GIS calculation is applied to this demo."
                    : "The score starts with mapped coverage, then accounts for meaningful coverage gaps and substantially longer routes. The methodology explains the full formula and its limitations."}
                </p>
                <Link className="text-link" href="/methodology">
                  Read the methodology <ArrowRight size={14} />
                </Link>
              </details>
              {comparison.provenance && (
                <details className="methodology">
                  <summary>Data sources & limitations</summary>
                  <p>
                    Pedestrian infrastructure data: City of Bentonville GIS.{" "}
                    {comparison.provenance.featureCount} features retrieved;{" "}
                    {comparison.provenance.eligibleSegmentCount} line parts
                    eligible for coverage. {comparison.routes.length} distinct
                    walking candidates retained from{" "}
                    {comparison.provenance.candidatesReceived} returned.
                  </p>
                  <p>
                    GIS retrieved:{" "}
                    {new Date(
                      comparison.provenance.gisFetchedAt,
                    ).toLocaleString()}
                    . Routing retrieved:{" "}
                    {new Date(
                      comparison.provenance.routingFetchedAt,
                    ).toLocaleString()}
                    . Retrieval times are not survey/update dates.
                  </p>
                  <p>
                    GIS cache:{" "}
                    {comparison.provenance.gisCacheHit
                      ? "hit"
                      : "fresh retrieval"}
                    ; route cache:{" "}
                    {comparison.provenance.routingCacheHit
                      ? "hit"
                      : "fresh retrieval"}
                    . Walking routes: Valhalla / OpenStreetMap, development
                    provider.
                  </p>
                  {comparison.provenance.gisSources?.map((source) => (
                    <p key={source.endpoint}>
                      <a href={source.endpoint}>Official City GIS source</a>:{" "}
                      {source.featureCount} features; retrieved{" "}
                      {new Date(source.fetchedAt).toLocaleString()} (
                      {source.cacheHit ? "cached" : "fresh"}).
                    </p>
                  ))}
                  {comparison.provenance.warnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                </details>
              )}
            </>
          )}
          {(status === "empty" || status === "error") && (
            <div className="empty-state">
              <TriangleAlert size={30} />
              <h2>
                {status === "empty"
                  ? "No demo route available"
                  : mock
                    ? "Comparison unavailable"
                    : /^Choose|^PathSafe currently/.test(error)
                      ? "Check your locations"
                      : /^No returned walking route/.test(error)
                        ? "No supported walking route"
                        : /^No walking route/.test(error)
                          ? "No walking route found"
                          : "Live route analysis is temporarily unavailable."}
              </h2>
              <p>
                {status === "empty"
                  ? "No supported walking comparison is available for these locations. Try different Bentonville locations."
                  : error}
              </p>
              <button className="text-link" onClick={() => reset()}>
                <RotateCcw size={16} />
                Reset demo
              </button>
              {!mock && status === "error" && (
                <button
                  className="button fallback-button"
                  onClick={() => {
                    reset("mock");
                    void runComparison({
                      start: demoLocations.start.label,
                      destination: demoLocations.destination.label,
                      source: "mock",
                    });
                  }}
                >
                  View demo data
                </button>
              )}
            </div>
          )}
        </div>

        <DataMethodology mock={mock} />
        <div className="data-notice">
          <Info size={17} />
          <p>
            Infrastructure coverage is not a guarantee of route conditions.{" "}
            {mock
              ? "Routes, facilities, and metrics in mock mode are illustrative."
              : "Public GIS data may be incomplete or outdated. Proximity does not verify connectivity, condition, or pedestrian access along the route. City-mapped points are not verified entrances."}
          </p>
        </div>
        <Link className="text-link methodology-link" href="/methodology">
          Methodology & data limitations <ArrowRight size={14} />
        </Link>
        {mock && (
          <details className="demo-controls">
            <summary>
              <SlidersHorizontal size={14} />
              Prototype state controls
            </summary>
            <label htmlFor="scenario">Next comparison result</label>
            <select
              id="scenario"
              value={scenario}
              disabled={!hydrated || status === "loading"}
              onChange={(e) => setScenario(e.target.value as DemoScenario)}
            >
              <option value="success">Successful comparison</option>
              <option value="no-route">No route</option>
              <option value="error">Error</option>
            </select>
          </details>
        )}
      </aside>
      <section className="explorer-map" aria-label="Route map">
        <RouteMap
          comparison={comparison}
          selected={selected}
          locations={{
            start: startLocation ?? undefined,
            destination: destinationLocation ?? undefined,
          }}
        />
        <div className="map-top-note">
          <Footprints size={16} />
          <span>More context for every step.</span>
        </div>
      </section>
    </main>
  );
}
