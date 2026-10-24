import { getUnifiedCatalog } from "./catalog";
import { searchUnifiedCatalog } from "./catalog/search";
import { cleanQuery } from "./city";
export async function searchLocationsDetailed(query: string) {
  const q = cleanQuery(query);
  if (q.length < 3 || q.length > 120)
    return { results: [], diagnostics: [], partial: false };
  const index = await getUnifiedCatalog();
  return {
    results: searchUnifiedCatalog(q, index),
    diagnostics: index.catalog.diagnostics,
    partial: index.catalog.diagnostics.some((d) => d.status === "unavailable"),
  };
}
export async function searchLocations(query: string) {
  return (await searchLocationsDetailed(query)).results;
}
export const geocodingProvider = { search: searchLocations };
