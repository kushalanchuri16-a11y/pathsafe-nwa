import { searchLocationsDetailed } from "@/lib/geocoding";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 3 || q.length > 120)
    return Response.json(
      { error: "Enter at least 3 characters (up to 120)." },
      { status: 400 },
    );
  try {
    const found = await searchLocationsDetailed(q);
    return Response.json(
      {
        results: found.results,
        diagnostics: found.diagnostics,
        ...(found.partial
          ? {
              warning:
                "Some official location sources are temporarily unavailable. Results may be incomplete.",
            }
          : {}),
        attribution: "City of Bentonville GIS",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: "Location search is temporarily unavailable. Please try again.",
      },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
}
