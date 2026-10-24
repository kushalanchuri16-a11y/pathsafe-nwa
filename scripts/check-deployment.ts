import nextEnv from "@next/env";
import { publicRoutingEndpoint } from "../lib/config";
import { resolveRoutingConfiguration } from "../lib/routing/config";
nextEnv.loadEnvConfig(process.cwd(), false);
try {
  const { provider, endpoint } = resolveRoutingConfiguration({
    NODE_ENV: "production",
    VALHALLA_URL: process.env.VALHALLA_URL,
    STADIA_API_KEY: process.env.STADIA_API_KEY,
    ROUTING_PROVIDER: process.env.ROUTING_PROVIDER,
  });
  console.log(
    "Production routing configuration valid:",
    provider,
    publicRoutingEndpoint(endpoint),
  );
  console.log(
    "Still required: confirm provider capacity, network access, function limits, and ephemeral cache behavior before deployment.",
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Invalid production configuration",
  );
  process.exitCode = 1;
}
