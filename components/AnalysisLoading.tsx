import { LoaderCircle } from "lucide-react";
export default function AnalysisLoading({ mock }: { mock: boolean }) {
  return (
    <div className="loading-state">
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
