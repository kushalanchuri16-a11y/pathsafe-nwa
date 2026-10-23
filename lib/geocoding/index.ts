import { cached } from "@/lib/server/cache";
import { CityGeocodingProvider, cleanQuery } from "./city";
import type { GeocodingProvider } from "./provider";
export const geocodingProvider: GeocodingProvider = new CityGeocodingProvider();
let active = 0,
  lastStart = 0;
let queue: Promise<void> = Promise.resolve();
export async function searchLocations(query: string) {
  const q = cleanQuery(query);
  if (q.length < 3 || q.length > 120) return [];
  return (
    await cached(
      `city-geocoding-${/^\d/.test(q) ? "address-v2" : "place-v1"}:${q.toLowerCase()}`,
      24 * 3600000,
      async () => {
        if (active >= 4)
          throw new Error(
            "Location search is busy. Please wait a moment and try again.",
          );
        active++;
        const previous = queue;
        let release!: () => void;
        queue = new Promise<void>((r) => {
          release = r;
        });
        try {
          await previous;
          const delay = Math.max(0, 1000 - (Date.now() - lastStart));
          if (delay) await new Promise((r) => setTimeout(r, delay));
          lastStart = Date.now();
          return await geocodingProvider.search(q);
        } finally {
          active--;
          release();
        }
      },
    )
  ).value;
}
