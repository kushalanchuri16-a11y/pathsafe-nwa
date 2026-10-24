import { valhallaProvider } from "./valhalla";
import type { WalkingRoutingProvider } from "./provider";
// The adapter resolves Stadia/local Valhalla on the server; both share one parser
// and the same normalized contract. Analysis and UI have no provider-specific code.
export const walkingRoutingProvider: WalkingRoutingProvider = valhallaProvider;
