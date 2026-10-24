import { readFile, writeFile } from "node:fs/promises";
import { getLiveRouteComparison } from "../lib/analysis/compare";
import { parseValhalla } from "../lib/routing/valhalla";
import { demoLocations } from "../data/demoLocations";
import type { getRouteInventory } from "../lib/gis/routeInventory";
import type { RouteComparison } from "../types/routes";
const c: RouteComparison = JSON.parse(
  await readFile("data/verification/cac-live-comparison.json", "utf8"),
);
const routing = async () => ({
  result: {
    routes: structuredClone(c.routes),
    received: 3,
    warnings: [],
    endpoint: "audit:captured-valid-pedestrian",
  },
  fetchedAt: new Date().toISOString(),
  cacheHit: true,
});
const inventory = async () =>
  ({
    dataset: {
      segments: c.infrastructure,
      featureCount: 317,
      countsByKind: {},
      warnings: [],
    },
    sidewalks: {
      value: {
        featureCount: 313,
        segments: c.infrastructure,
        countsByKind: {},
        warnings: [],
      },
      expiresAt: Date.now() + 10000,
      fetchedAt: new Date().toISOString(),
      cacheHit: true,
    },
    trails: {
      value: { featureCount: 4, segments: [], countsByKind: {}, warnings: [] },
      expiresAt: Date.now() + 10000,
      fetchedAt: new Date().toISOString(),
      cacheHit: true,
    },
  }) as Awaited<ReturnType<typeof getRouteInventory>>;
const rows = [];
for (const failure of [
  "provider offline",
  "timeout",
  "malformed provider",
  "empty provider",
  "GIS unavailable",
  "all routes outside",
  "empty confirmed inventory",
]) {
  try {
    const result = await getLiveRouteComparison(undefined, {
      routing: {
        getCandidates: async () => {
          if (failure === "provider offline" || failure === "timeout")
            throw new Error(failure);
          if (failure === "malformed provider")
            parseValhalla({ code: "Ok", routes: null }, "audit");
          const value = await routing();
          if (failure === "empty provider") value.result.routes = [];
          if (failure === "all routes outside")
            value.result.routes.forEach((r) => r.geometry.push([36.33, -94.1]));
          return value;
        },
      },
      inventory: async () => {
        if (failure === "GIS unavailable") throw new Error("GIS offline");
        const value = await inventory();
        if (failure === "empty confirmed inventory") {
          value.dataset.segments = [];
          value.dataset.featureCount = 0;
          value.sidewalks.value.featureCount = 0;
          value.trails.value.featureCount = 0;
        }
        return value;
      },
    });
    rows.push({
      failure,
      result: result.source,
      coverage: result.routes.map((r) => r.metrics.coverage),
      gaps: result.routes.map((r) => r.metrics.gaps),
    });
  } catch (e) {
    rows.push({
      failure,
      errorType: e instanceof Error ? e.constructor.name : "unknown",
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
for (const [name, start, destination] of [
  ["invalid start", null, demoLocations.destination],
  ["invalid destination", demoLocations.start, null],
  ["identical endpoints", demoLocations.start, demoLocations.start],
  [
    "XNA coordinates",
    { label: "XNA", point: [36.2818694444, -94.3068111111] },
    demoLocations.destination,
  ],
] as const) {
  const response = await fetch("http://127.0.0.1:3000/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start, destination }),
  });
  rows.push({
    failure: name,
    status: response.status,
    body: await response.json(),
  });
}
const boundary = JSON.parse(
  await readFile("data/boundary/bentonville.json", "utf8"),
);
rows.push({
  failure: "City Limits upstream unavailable",
  result:
    "Boundary validation uses the bundled official snapshot, not a runtime HTTP request.",
  polygonCount: boundary.features[0].geometry.coordinates.length,
});
await writeFile(
  "data/website-audit/errors.json",
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      note: "Fault injection into the shared production analysis pipeline plus real API input rejection; not an assertion of an actual source outage.",
      rows,
    },
    null,
    2,
  ) + "\n",
);
console.log(rows);
