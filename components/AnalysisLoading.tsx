import { LoaderCircle } from "lucide-react";
export default function AnalysisLoading({ mock }: { mock: boolean }) {
  return (
    <div className="loading-state">
      <svg
        className="loading-route"
        viewBox="0 0 160 52"
        fill="none"
        aria-hidden="true"
      >
        <path d="M8 40H54V12H106V40H152" />
        <path
          className="loading-route-trace"
          d="M8 40H54V12H106V40H152"
          pathLength="1"
        />
        <circle cx="8" cy="40" r="4" />
        <circle cx="152" cy="40" r="4" />
      </svg>
      <h2>
        {mock
          ? "Preparing the mock comparison…"
          : "Preparing your route comparison…"}
      </h2>
      {mock ? (
        <p>Loading clearly labeled illustrative routes.</p>
      ) : (
        <ol aria-label="Analysis steps">
          <li>
            <LoaderCircle className="spin" size={14} aria-hidden="true" />
            Finding walking routes…
          </li>
          <li>
            <span className="loading-step-dot" />
            Comparing mapped pedestrian infrastructure…
          </li>
          <li>
            <span className="loading-step-dot" />
            Calculating route coverage…
          </li>
        </ol>
      )}
      <div className="skeleton" />
      <small>
        {mock
          ? "Demo values are illustrative."
          : "First retrieval may take a little longer. Repeated comparisons use cached data."}
      </small>
    </div>
  );
}
