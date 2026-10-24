import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: {
    "/api/locations": [
      "./data/location-catalog/snapshot.json.gz",
      "./data/location-catalog/parks-directory/inventory.json",
      "./data/location-catalog/parks-directory/parcel-evidence.json",
    ],
  },
};
export default config;
