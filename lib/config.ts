export const PUBLIC_VALHALLA_ENDPOINT =
  "https://valhalla1.openstreetmap.de/route";
export class RoutingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutingConfigurationError";
  }
}
export function resolveRoutingEndpoint(
  environment: { NODE_ENV?: string; VALHALLA_URL?: string } = process.env,
) {
  const configured = environment.VALHALLA_URL?.trim(),
    production = environment.NODE_ENV === "production";
  if (production && !configured)
    throw new RoutingConfigurationError(
      "Configure VALHALLA_URL with a hosted/private /route endpoint before enabling production live analysis.",
    );
  let url: URL;
  try {
    url = new URL(configured ?? PUBLIC_VALHALLA_ENDPOINT);
  } catch {
    throw new RoutingConfigurationError(
      "VALHALLA_URL must be a valid absolute routing URL.",
    );
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !url.pathname.replace(/\/$/, "").endsWith("/route") ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new RoutingConfigurationError(
      "VALHALLA_URL must be an HTTP(S) /route endpoint without URL user credentials or a fragment.",
    );
  if (
    production &&
    (url.protocol !== "https:" ||
      url.hostname === "openstreetmap.de" ||
      url.hostname.endsWith(".openstreetmap.de"))
  )
    throw new RoutingConfigurationError(
      "Production requires an HTTPS hosted/private Valhalla service. The public demo cannot be used as the production provider.",
    );
  return url.toString();
}
export function publicRoutingEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  return url.origin + url.pathname;
}
