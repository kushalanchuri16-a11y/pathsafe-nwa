import type { Fetcher } from "@/lib/server/http";
import { RoutingProviderError } from "./errors";
import { STADIA_ROUTING_ENDPOINT } from "./config";

// Errors and response bodies are deliberately never echoed: upstream services or
// fetch implementations can include credentials in their diagnostics.
export async function fetchRoutingJson(
  url: URL,
  fetcher: Fetcher,
  apiKey?: string,
): Promise<unknown> {
  if (apiKey && url.origin + url.pathname !== STADIA_ROUTING_ENDPOINT)
    throw new RoutingProviderError("ROUTING_AUTHENTICATION_FAILED");
  let response: Response;
  try {
    response = await fetcher(url.toString(), {
      headers: {
        "X-Client-Id": "PathSafe-NWA-development",
        Accept: "application/json",
        ...(apiKey ? { Authorization: `Stadia-Auth ${apiKey}` } : {}),
      },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    throw new RoutingProviderError(
      error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
        ? "ROUTING_TIMEOUT"
        : "ROUTING_UNAVAILABLE",
    );
  }
  if (response.status === 401 || response.status === 403)
    throw new RoutingProviderError("ROUTING_AUTHENTICATION_FAILED");
  if (response.status === 429)
    throw new RoutingProviderError("ROUTING_RATE_LIMITED");
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new RoutingProviderError(
      error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
        ? "ROUTING_TIMEOUT"
        : response.ok
          ? "ROUTING_MALFORMED_RESPONSE"
          : "ROUTING_UNAVAILABLE",
    );
  }
  // Valhalla may report no-path using an HTTP 400 envelope instead of OSRM NoRoute.
  if (
    body &&
    typeof body === "object" &&
    "error_code" in body &&
    body.error_code === 442
  )
    throw new RoutingProviderError("ROUTING_NO_ROUTE");
  if (!response.ok) throw new RoutingProviderError("ROUTING_UNAVAILABLE");
  if (!body || typeof body !== "object" || "error" in body)
    throw new RoutingProviderError("ROUTING_MALFORMED_RESPONSE");
  return body;
}
