// One local API request warms the real pipeline using the server's configured provider.
import { demoLocations } from "../data/demoLocations";
const base = process.argv[2] ?? "http://localhost:3000";
try {
  const response = await fetch(new URL("/api/compare", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: demoLocations.start.label,
      destination: demoLocations.destination.label,
    }),
    signal: AbortSignal.timeout(60000),
  });
  const body = await response.json();
  if (!response.ok || body.comparison?.source !== "live")
    throw new Error(body.error ?? "A real comparison was not returned.");
  const c = body.comparison;
  console.log(
    "REAL DATA prewarm complete. Open /app and compare the verified demo pair.",
  );
  console.log("Verified trip:", c.start.label, "→", c.destination.label);
  console.table(
    c.routes.map(
      (r: {
        name: string;
        recommended: boolean;
        metrics: {
          minutes: number;
          miles: number;
          coverage: number;
          gaps: number;
          score: number;
        };
      }) => ({
        route: r.name,
        recommended: r.recommended,
        minutes: r.metrics.minutes.toFixed(2),
        miles: r.metrics.miles.toFixed(2),
        coverage: r.metrics.coverage.toFixed(2) + "%",
        gaps: r.metrics.gaps,
        score: r.metrics.score,
      }),
    ),
  );
  console.log(
    "GIS retrieved:",
    c.provenance.gisFetchedAt,
    "Routing retrieved:",
    c.provenance.routingFetchedAt,
  );
  console.log(
    "Existing cache hits:",
    c.provenance.gisCacheHit,
    c.provenance.routingCacheHit,
    "(fresh successful results are now cached)",
  );
} catch (error) {
  console.error(
    "Prewarm failed:",
    error instanceof Error ? error.message : "Unknown failure",
  );
  console.error(
    "Keep real analysis labeled unavailable. Retry later or explicitly select View demo data / Mock demo; never present mock values as real.",
  );
  process.exitCode = 1;
}
