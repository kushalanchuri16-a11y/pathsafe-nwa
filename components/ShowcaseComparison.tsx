import { ArrowUpRight, Check, MapPin } from "lucide-react";
import Link from "next/link";
// Server-only import: only the displayed SVG and numbers reach the browser.
import showcase from "@/data/verification/cac-live-comparison.json";

export default function ShowcaseComparison() {
  const fastest = showcase.routes[0],
    recommended = showcase.routes.find((r) => r.recommended)!;
  const routes = [fastest, recommended];
  const points = routes.flatMap((r) => r.geometry);
  const xs = points.map((p) => p[1]),
    ys = points.map((p) => p[0]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const project = (point: number[]) => [
    76 + ((point[1] - minX) / (maxX - minX)) * 268,
    282 - ((point[0] - minY) / (maxY - minY)) * 226,
  ];
  const start = project(fastest.geometry[0]),
    end = project(fastest.geometry.at(-1)!);
  const extra = Math.round(
    recommended.metrics.seconds! - fastest.metrics.seconds!,
  );
  return (
    <section
      className="showcase-section section"
      aria-labelledby="showcase-title"
      data-reveal
    >
      <div className="showcase-copy">
        <span className="eyebrow">A WALK. TWO DIFFERENT PERSPECTIVES.</span>
        <h2 id="showcase-title">
          A few seconds.
          <br />
          <span>A lot more context.</span>
        </h2>
        <p>
          Compare the fastest route with a route that follows more mapped
          pedestrian infrastructure.
        </p>
        <div className="showcase-trip">
          <MapPin size={15} aria-hidden="true" />
          <span>
            Austin-Baggett Park <span aria-hidden="true">→</span> Lawrence Plaza
          </span>
        </div>
        <div className="showcase-note">
          <span className="mock-label">ILLUSTRATIVE SHOWCASE</span>
          <p>
            Rounded values and route shapes from a recorded live comparison.
            This example is not live navigation; current results may differ.
          </p>
        </div>
        <Link className="text-link" href="/app">
          Compare this walk <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="showcase-board">
        <div className="showcase-map">
          <span className="showcase-map-label">ONE TRIP / TWO ROUTES</span>
          <svg
            viewBox="0 0 420 340"
            role="img"
            aria-label="Recorded showcase route shapes, displayed as an illustrative diagram rather than a navigation map"
          >
            <defs>
              <pattern
                id="showcase-grid"
                width="44"
                height="44"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M44 0H0V44"
                  fill="none"
                  stroke="#d8e2d5"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <path fill="url(#showcase-grid)" d="M0 0H420V340H0z" />
            {routes.map((r, i) => (
              <polyline
                key={r.id}
                className={`showcase-path showcase-path-${i}`}
                points={r.geometry.map((p) => project(p).join(",")).join(" ")}
                fill="none"
                pathLength="1"
              />
            ))}
            <circle
              cx={start[0]}
              cy={start[1]}
              r="7"
              fill="#253a33"
              stroke="#fff"
              strokeWidth="3"
            />
            <circle
              cx={end[0]}
              cy={end[1]}
              r="7"
              fill="#19664f"
              stroke="#fff"
              strokeWidth="3"
            />
            <text x={start[0]} y={start[1] + 25} textAnchor="middle">
              START
            </text>
            <text x={end[0]} y={end[1] - 18} textAnchor="middle">
              DESTINATION
            </text>
          </svg>
          <div className="showcase-time">
            <span>THE TIME TRADEOFF</span>
            <strong>
              ~{extra} <small>seconds</small>
            </strong>
            <p>additional walking time</p>
          </div>
        </div>
        <div className="showcase-metrics">
          {routes.map((r, i) => (
            <div
              className={`showcase-metric ${i ? "showcase-choice" : ""}`}
              key={r.id}
            >
              <div className="showcase-route-name">
                <i className={`route-line ${i ? "pathsafe" : "fastest"}`} />
                {i ? "PathSafe Route" : "Fastest Route"}
                {i === 1 && (
                  <Check size={15} aria-label="Recommended in this example" />
                )}
              </div>
              <strong className="showcase-number">
                ~{r.metrics.coverage.toFixed(1)}
                <small>%</small>
              </strong>
              <p>mapped infrastructure coverage</p>
              <div className="route-coverage-track" aria-hidden="true">
                <span style={{ width: `${r.metrics.coverage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
