import { valhallaProvider } from "./valhalla";
import type { WalkingRoutingProvider } from "./provider";
// Swap providers here; analysis and UI consume the normalized walking-provider contract.
export const walkingRoutingProvider: WalkingRoutingProvider = valhallaProvider;
