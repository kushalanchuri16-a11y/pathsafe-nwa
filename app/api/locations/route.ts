import { searchLocations } from "@/lib/geocoding";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 3 || q.length > 120)
    return Response.json(
      { error: "Enter at least 3 characters (up to 120)." },
      { status: 400 },
    );
  try {
    return Response.json(
      {
        results: await searchLocations(q),
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
