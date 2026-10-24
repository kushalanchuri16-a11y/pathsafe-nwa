import { readFile, writeFile, mkdir } from "node:fs/promises";
import boundary from "../data/boundary/bentonville.json";
import { getUnifiedCatalog } from "../lib/geocoding/catalog";
import { searchUnifiedCatalog } from "../lib/geocoding/catalog/search";
import { validateSelection } from "../lib/geocoding/validate";
import { lineWithinArea, type Polygon } from "../lib/geocoding/area";
import { getLiveRouteComparison } from "../lib/analysis/compare";
import { walkingRoutingProvider } from "../lib/routing";
import { getRouteInventory } from "../lib/gis/routeInventory";
import { coordinateDistance } from "../lib/analysis/geometry";
import type { WalkingRouteResult } from "../lib/routing/provider";
import type { OfficialLocation } from "../lib/geocoding/catalog/model";
const dir = "data/location-catalog/routing";
await mkdir(dir, { recursive: true });
const index = await getUnifiedCatalog(),
  audit = JSON.parse(
    await readFile("data/location-catalog/completeness.json", "utf8"),
  );
const named = index.named,
  find = (q: string) => searchUnifiedCatalog(q, index)[0];
const civic = [
  "Lawrence Plaza",
  "Bentonville Public Library",
  "Crystal Bridges",
  "Bentonville Community Center",
  "Bentonville Municipal Airport",
  "Memorial Park",
  "Austin-Baggett Park",
].map(find);
const school = named
  .filter((r) => r.provenance.some((p) => p.source.startsWith("schools-")))
  .sort((a, b) => b.point[0] - a.point[0]);
const parks = named
  .filter(
    (r) =>
      r.provenance.some((p) => p.source === "parks") && r.type !== "school",
  )
  .sort((a, b) => b.point[0] - a.point[0]);
const addresses = audit.addresses.map((r: { id: string }) =>
  index.catalog.records.find((x) => x.id === r.id)!,
);
const pairs: {
  start: OfficialLocation;
  destination: OfficialLocation;
  group: string;
}[] = [];
const add = (
  start: OfficialLocation,
  destination: OfficialLocation,
  group: string,
) => {
  if (
    coordinateDistance(start.point, destination.point) >= 20 &&
    !pairs.some(
      (p) => p.start.id === start.id && p.destination.id === destination.id,
    )
  )
    pairs.push({ start, destination, group });
};
if (process.argv.includes("--reconcile")) {
  const previous = JSON.parse(await readFile(`${dir}/summary.json`, "utf8"));
  try {
    await readFile(`${dir}/first-pass.json`);
  } catch {
    await writeFile(
      `${dir}/first-pass.json`,
      JSON.stringify(previous, null, 2) + "\n",
    );
  }
  const resolve = (endpoint: { id: string }) => {
    const direct = index.catalog.records.find((r) => r.id === endpoint.id);
    if (direct) return direct;
    const [prefix, oid] = endpoint.id.split(":");
    const source =
      prefix === "city-place"
        ? "common"
        : prefix === "city-address"
          ? "city-addresses"
          : prefix;
    const merged = named.find((r) =>
      r.provenance.some(
        (p) => p.source === source && p.sourceObjectId === Number(oid),
      ),
    );
    if (!merged)
      throw new Error(
        "Test endpoint no longer has an official catalog identity: " +
          endpoint.id,
      );
    return merged;
  };
  for (const row of previous.results as {
    start: { id: string };
    destination: { id: string };
    group: string;
  }[])
    pairs.push({
      start: resolve(row.start),
      destination: resolve(row.destination),
      group: row.group,
    });
} else {
  add(find("Austin-Baggett Park"), find("Lawrence Plaza"), "showcase");
  school.forEach((r, i) => add(r, civic[i % civic.length], "school"));
  parks.forEach((r, i) =>
    add(r, civic[(i + 2) % civic.length], "parks / recreation"),
  );
  addresses.forEach((r: OfficialLocation, i: number) =>
    add(r, civic[i % civic.length], "residential / city edge"),
  );
  civic.forEach((r, i) =>
    add(r, civic[(i + 3) % civic.length], "civic / cross-city"),
  );
}
if (process.argv.includes("--extend")) {
  for (const r of named.filter((r) =>
    r.provenance.some((p) => p.source === "city-parks-directory"),
  ))
    if (!pairs.some((p) => p.start.id === r.id || p.destination.id === r.id))
      add(r, find("Bentonville Community Center"), "official parks directory");
  for (const r of named
    .filter((r) =>
      r.provenance.some((p) => p.source === "registered-businesses"),
    )
    .slice(0, 3))
    add(r, find("Lawrence Plaza"), "issued non-home business");
  const parking = named.find((r) =>
    r.provenance.some((p) => p.source === "public-parking"),
  );
  if (parking) add(parking, find("Lawrence Plaza"), "always-public parking");
}
const outer: Polygon[] = boundary.features
  .flatMap((f) => f.geometry.coordinates)
  .map((p) => [p[0]]);
const results = [];
console.log("Planned pairs", pairs.length);
const endpoint = (r: OfficialLocation) => ({
  id: r.id,
  label: r.label,
  point: r.point,
  searchable: searchUnifiedCatalog(r.label, index).some((x) => x.id === r.id),
  selectable: !!validateSelection(r),
  inside: r.supported,
});
for (const [i, p] of pairs.entries()) {
  const file = `${dir}/pair-${String(i + 1).padStart(3, "0")}.json`;
  try {
    const prior = JSON.parse(await readFile(file, "utf8"));
    if (
      JSON.stringify(prior.start.point) === JSON.stringify(p.start.point) &&
      JSON.stringify(prior.destination.point) ===
        JSON.stringify(p.destination.point)
    ) {
      prior.catalogReconciledAt = new Date().toISOString();
      prior.start = endpoint(p.start);
      prior.destination = endpoint(p.destination);
      await writeFile(file, JSON.stringify(prior, null, 2) + "\n");
      results.push(prior);
      continue;
    }
    await writeFile(
      file.replace(".json", ".previous.json"),
      JSON.stringify(prior, null, 2) + "\n",
    );
  } catch {
    /* New evidence. */
  }
  if (i > 0) await new Promise((r) => setTimeout(r, 5000));
  let provider: WalkingRouteResult | undefined,
    providerError: string | undefined;
  const began = performance.now();
  const row: { [k: string]: unknown } = {
    id: i + 1,
    checkedAt: new Date().toISOString(),
    group: p.group,
    start: endpoint(p.start),
    destination: endpoint(p.destination),
  };
  try {
    const comparison = await getLiveRouteComparison(
      { start: p.start, destination: p.destination },
      {
        inventory: getRouteInventory,
        routing: {
          async getCandidates(request) {
            try {
              const response =
                await walkingRoutingProvider.getCandidates(request);
              provider = response.result;
              return response;
            } catch (error) {
              providerError = String(error);
              throw error;
            }
          },
        },
      },
    );
    row.result = "PASS";
    row.recommendation = comparison.recommendation;
    row.routes = comparison.routes.map((r) => ({
      id: r.id,
      recommended: r.recommended,
      metrics: r.metrics,
      vertices: r.geometry.length,
    }));
    row.provenance = comparison.provenance;
  } catch (error) {
    row.result = "UNSUPPORTED_OR_UNAVAILABLE";
    row.error = error instanceof Error ? error.message : String(error);
    row.providerError = providerError;
  }
  if (provider) {
    row.providerReceived = provider.received;
    row.distinctAlternatives = provider.routes.length;
    row.alternatives = provider.routes.map((r) => {
      const inside = lineWithinArea(r.geometry),
        outerInside = lineWithinArea(r.geometry, outer);
      return {
        id: r.id,
        inside,
        reason: inside
          ? "Retained"
          : outerInside
            ? "Internal municipal polygon hole"
            : "Real outer city exit (may also cross holes)",
        startSnapMeters: coordinateDistance(p.start.point, r.geometry[0]),
        endSnapMeters: coordinateDistance(
          p.destination.point,
          r.geometry.at(-1)!,
        ),
        vertices: r.geometry.length,
      };
    });
    row.validAlternatives = provider.routes.filter((r) =>
      lineWithinArea(r.geometry),
    ).length;
    if (row.result !== "PASS")
      row.failureCause =
        (row.validAlternatives as number) > 0
          ? "Infrastructure data/analysis unavailable"
          : (row.alternatives as { reason: string }[])
              .map((r) => r.reason)
              .join("; ");
  } else
    row.failureCause = providerError?.includes("snapped more than 100m")
      ? "Endpoint snapping exceeds existing 100m limit"
      : providerError?.includes("no walking route")
        ? "Provider returned no pedestrian connection"
        : providerError?.match(
              /geometry|Invalid pedestrian|Invalid walking|Unexpected route/,
            )
          ? "Provider malformed geometry/response"
          : `Provider unavailable: ${providerError ?? String(row.error)}`;
  row.elapsedMs = performance.now() - began;
  await writeFile(file, JSON.stringify(row, null, 2) + "\n");
  results.push(row);
  await writeFile(
    `${dir}/summary.json`,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        planned: pairs.length,
        completed: results.length,
        passed: results.filter((r) => r.result === "PASS").length,
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    i + 1,
    p.start.label,
    "→",
    p.destination.label,
    row.result,
    row.failureCause ?? "",
  );
}

await writeFile(
  `${dir}/summary.json`,
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      planned: pairs.length,
      completed: results.length,
      passed: results.filter((r) => r.result === "PASS").length,
      results,
    },
    null,
    2,
  ) + "\n",
);
