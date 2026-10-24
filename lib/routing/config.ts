// Server routing configuration. Never import from a client component.
import {
  resolveRoutingEndpoint,
  RoutingConfigurationError,
} from "@/lib/config";

export const STADIA_ROUTING_ENDPOINT = "https://api.stadiamaps.com/route/v1";
export interface RoutingEnvironment {
  NODE_ENV?: string;
  ROUTING_PROVIDER?: string;
  STADIA_API_KEY?: string;
  VALHALLA_URL?: string;
}
export function resolveRoutingConfiguration(
  environment: RoutingEnvironment = process.env,
) {
  const selected = environment.ROUTING_PROVIDER?.trim();
  if (selected && selected !== "stadia" && selected !== "valhalla")
    throw new RoutingConfigurationError(
      "ROUTING_PROVIDER must be stadia or valhalla.",
    );
  const provider =
    selected ||
    (environment.STADIA_API_KEY?.trim()
      ? "stadia"
      : environment.VALHALLA_URL?.trim() ||
          environment.NODE_ENV !== "production"
        ? "valhalla"
        : "stadia");
  if (provider === "stadia") {
    const apiKey = environment.STADIA_API_KEY?.trim();
    if (!apiKey || /\s/.test(apiKey))
      throw new RoutingConfigurationError(
        "Configure a valid server-side STADIA_API_KEY for Stadia routing.",
      );
    return { provider, endpoint: STADIA_ROUTING_ENDPOINT, apiKey } as const;
  }
  return {
    provider,
    endpoint: resolveRoutingEndpoint(environment),
    apiKey: undefined,
  } as const;
}
