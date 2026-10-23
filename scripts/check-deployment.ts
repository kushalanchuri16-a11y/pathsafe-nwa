import nextEnv from "@next/env";
import { resolveRoutingEndpoint, publicRoutingEndpoint } from "../lib/config";
nextEnv.loadEnvConfig(process.cwd(), false);
try {
  const endpoint = resolveRoutingEndpoint({
    NODE_ENV: "production",
    VALHALLA_URL: process.env.VALHALLA_URL,
  });
  console.log(
    "Production routing configuration valid:",
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
