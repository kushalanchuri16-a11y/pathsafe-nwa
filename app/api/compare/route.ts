import { getLiveRouteComparison } from "@/lib/analysis/compare";
import { RoutingConfigurationError } from "@/lib/config";
import { validateTrip } from "@/lib/geocoding/validate";
import { AnalysisUnavailableError } from "@/lib/server/analysisError";
import { RouteBoundaryError } from "@/lib/geocoding/supportedRoutes";
import { LocationError } from "@/lib/geocoding/provider";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  let input: unknown;
  try {
    const text = await request.text();
    if (text.length > 1000) throw new Error("Request too large");
    input = JSON.parse(text);
  } catch {
    return Response.json(
      { error: "Invalid comparison request." },
      { status: 400 },
    );
  }
  const p = input as { start?: unknown; destination?: unknown } | null;
  try {
    return Response.json(
      {
        comparison: await getLiveRouteComparison(
          validateTrip(p?.start, p?.destination),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Keep location, boundary and upstream failures distinct for actionable feedback.
    if (error instanceof RouteBoundaryError)
      return Response.json(
        { error: error.message, code: "ROUTE_OUTSIDE_SUPPORTED_AREA" },
        { status: 422 },
      );
    if (error instanceof LocationError)
      return Response.json(
        { error: error.message, code: "INVALID_LOCATION" },
        { status: 400 },
      );
    console.error(
      "PathSafe live analysis failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      {
        code:
          error instanceof RoutingConfigurationError
            ? "ROUTING_NOT_CONFIGURED"
            : "LIVE_ANALYSIS_UNAVAILABLE",
        error:
          error instanceof AnalysisUnavailableError
            ? error.message
            : "Live route analysis is temporarily unavailable.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": "60" },
      },
    );
  }
}
