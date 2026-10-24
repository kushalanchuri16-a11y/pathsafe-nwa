const messages = {
  ROUTING_AUTHENTICATION_FAILED:
    "Walking route provider authentication failed. Check the server routing credentials.",
  ROUTING_RATE_LIMITED:
    "Walking route provider rate limit reached. Please retry later.",
  ROUTING_TIMEOUT: "Walking route provider timed out. Please retry.",
  ROUTING_MALFORMED_RESPONSE:
    "Walking route provider returned an invalid response. Please retry later.",
  ROUTING_NO_ROUTE: "Routing provider returned no walking route.",
  ROUTING_UNAVAILABLE:
    "Walking route provider is temporarily unavailable. Please retry later.",
} as const;
export class RoutingProviderError extends Error {
  constructor(public readonly code: keyof typeof messages) {
    super(messages[code]);
    this.name = "RoutingProviderError";
  }
}
