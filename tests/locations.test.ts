import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CityGeocodingProvider,
  normalizeCityResults,
} from "../lib/geocoding/city";
import {
  isWithinSupportedArea,
  withinPolygons,
  lineWithinArea,
  type Polygon,
} from "../lib/geocoding/area";
import { validateTrip } from "../lib/geocoding/validate";
import { demoLocations } from "../data/demoLocations";
import {
  getLiveRouteComparison,
  analyzeCandidates,
} from "../lib/analysis/compare";
import {
  routeQueryBounds,
  type getRouteInventory,
} from "../lib/gis/routeInventory";
import { POST } from "../app/api/compare/route";
import type { RouteComparison } from "../types/routes";
import type { Fetcher } from "../lib/server/http";
const captured: RouteComparison = JSON.parse(
  readFileSync("data/verification/cac-live-comparison.json", "utf8"),
);
const place = (id = 1, label = "Library") => ({
  properties: { OBJECTID: id, COMMON_NAME: label, ADDRESS: "405 S MAIN ST" },
  geometry: {
    type: "Point",
    coordinates: [-94.20851110772566, 36.36770870312484],
  },
});
test("official City boundary accepts verified Bentonville points, rejects neighboring/outside and invalid points", () => {
  for (const p of [
    demoLocations.start.point,
    demoLocations.destination.point,
    [36.36770870312484, -94.20851110772566],
  ])
    assert.ok(isWithinSupportedArea(p[0], p[1]));
  for (const p of [
    [36.3729, -94.2852],
    [36.332, -94.1185],
    [0, 0],
    [NaN, -94.2],
  ])
    assert.equal(isWithinSupportedArea(p[0], p[1]), false);
});
test("boundary handles holes, concave edges and crossings between otherwise valid route vertices", () => {
  const area: Polygon[] = [
    [
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ],
      [
        [1, 1],
        [2, 1],
        [2, 2],
        [1, 2],
        [1, 1],
      ],
    ],
  ];
  assert.equal(withinPolygons(1.5, 1.5, area), false);
  assert.ok(withinPolygons(0.5, 0.5, area));
  assert.equal(
    lineWithinArea(
      [
        [1.5, 0.5],
        [1.5, 3],
      ],
      area,
    ),
    false,
  );
  assert.ok(
    lineWithinArea(
      [
        [0.5, 0.5],
        [0.5, 3],
      ],
      area,
    ),
  );
});
test("City geocoding normalizes, deduplicates and removes outside/invalid locations", () => {
  const items = normalizeCityResults(
    [
      place(),
      place(),
      { ...place(2), geometry: { type: "Point", coordinates: [-94.1, 36.33] } },
      { ...place(3), geometry: { type: "LineString", coordinates: [] } },
    ],
    "place",
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].label, "Library");
  assert.equal(items[0].attribution, "City of Bentonville GIS");
  assert.deepEqual(items[0].point, [36.36770870312484, -94.20851110772566]);
});
test("forward provider preserves ambiguous choices, handles empty results, escapes queries and propagates failures", async () => {
  const provider = new CityGeocodingProvider((async (input) => {
    const url = new URL(String(input));
    assert.ok(url.searchParams.get("where")?.includes("LIBRARY"));
    assert.equal(url.searchParams.get("resultRecordCount"), "8");
    return Response.json({
      type: "FeatureCollection",
      features: [place(), place(2, "Library annex")],
    });
  }) as Fetcher);
  assert.equal((await provider.search("Bentonville Public Library")).length, 2);
  const empty = new CityGeocodingProvider((async () =>
    Response.json({ type: "FeatureCollection", features: [] })) as Fetcher);
  assert.deepEqual(await empty.search("Unknown Place"), []);
  assert.deepEqual(await provider.search("li"), []);
  const failing = new CityGeocodingProvider((async () => {
    throw new Error("network offline");
  }) as Fetcher);
  await assert.rejects(failing.search("Library"), /offline/);
});
test("unresolved text, outside locations and same/nearby coordinates fail before routing", async () => {
  assert.throws(
    () => validateTrip("Some address", "Other address"),
    /suggestions/,
  );
  assert.throws(
    () =>
      validateTrip(demoLocations.start, {
        label: "Rogers",
        point: [36.33, -94.1],
      }),
    /currently supports locations/,
  );
  assert.throws(
    () => validateTrip(demoLocations.start, demoLocations.start),
    /20 meters/,
  );
  const response = await POST(
    new Request("http://localhost/api/compare", {
      method: "POST",
      body: JSON.stringify({
        start: demoLocations.start,
        destination: { label: "Outside", point: [36.33, -94.1] },
      }),
    }),
  );
  assert.equal(response.status, 400);
  assert.match(
    (await response.json()).error,
    /PathSafe currently supports locations within Bentonville, Arkansas/,
  );
});
function inventory() {
  return Promise.resolve({
    dataset: {
      segments: captured.infrastructure,
      featureCount: 317,
      countsByKind: captured.provenance!.countsByKind,
      warnings: [],
    },
    sidewalks: {
      value: {
        featureCount: 313,
        segments: captured.infrastructure,
        countsByKind: {},
        warnings: [],
      },
      expiresAt: Date.now() + 10000,
      fetchedAt: "2026-10-23T00:00:00Z",
      cacheHit: true,
    },
    trails: {
      value: { featureCount: 4, segments: [], countsByKind: {}, warnings: [] },
      expiresAt: Date.now() + 10000,
      fetchedAt: "2026-10-23T00:00:00Z",
      cacheHit: true,
    },
  } as Awaited<ReturnType<typeof getRouteInventory>>);
}
const routing = {
  getCandidates: async () => ({
    result: {
      routes: structuredClone(captured.routes),
      received: 3,
      warnings: [],
      endpoint: "fixture:pedestrian",
    },
    fetchedAt: "2026-10-23T00:00:00Z",
    cacheHit: true,
  }),
};
test("custom validated points and showcase use exactly the shared production scoring/coverage pipeline", async () => {
  const input = {
    start: {
      label: "Library",
      point: [36.36770870312484, -94.20851110772566] as [number, number],
    },
    destination: demoLocations.destination,
  };
  let queried = false;
  const result = await getLiveRouteComparison(input, {
    routing: {
      getCandidates: async (request) => {
        assert.deepEqual(request.start, input.start.point);
        return routing.getCandidates();
      },
    },
    inventory: async (lines) => {
      queried = true;
      assert.equal(lines.length, 3);
      return inventory();
    },
  });
  assert.ok(queried);
  assert.equal(result.start.label, "Library");
  assert.equal(result.source, "live");
  const expected = analyzeCandidates(captured.routes, {
    segments: captured.infrastructure,
    featureCount: 317,
    countsByKind: {},
    warnings: [],
  });
  assert.deepEqual(
    result.routes.map((r) => r.metrics),
    expected.routes.map((r) => r.metrics),
  );
  const showcase = await getLiveRouteComparison(undefined, {
    routing,
    inventory,
  });
  assert.equal(showcase.recommendation?.routeId, "pathsafe");
  assert.equal(showcase.routes[1].metrics.score, 94);
  assert.equal(showcase.routes[0].metrics.score, 69);
});
test("routing failure, GIS failure, no route and outside route never become mock results", async () => {
  await assert.rejects(
    getLiveRouteComparison(undefined, {
      routing: {
        getCandidates: async () => {
          throw new Error("timeout");
        },
      },
      inventory,
    }),
    /Walking routing failed or timed out/,
  );
  await assert.rejects(
    getLiveRouteComparison(undefined, {
      routing,
      inventory: async () => {
        throw new Error("GIS offline");
      },
    }),
    /City infrastructure/,
  );
  await assert.rejects(
    getLiveRouteComparison(undefined, {
      routing: {
        getCandidates: async () => ({
          ...(await routing.getCandidates()),
          result: { ...(await routing.getCandidates()).result, routes: [] },
        }),
      },
      inventory,
    }),
    /No walking route/,
  );
  const outside = await routing.getCandidates();
  outside.result.routes[0].geometry.push([36.33, -94.1]);
  await assert.rejects(
    getLiveRouteComparison(undefined, {
      routing: { getCandidates: async () => outside },
      inventory,
    }),
    /outside Bentonville/,
  );
});
test("long trip GIS envelopes tile without loosening existing bounded query protections", () => {
  const tiles = routeQueryBounds([
    [
      [36.26, -94.34],
      [36.4, -94.19],
    ],
  ]);
  assert.ok(tiles.length > 1);
  assert.ok(tiles.every((t) => t[2] - t[0] <= 0.08 && t[3] - t[1] <= 0.08));
});

test("address queries preserve house number and compass direction", async () => {
  const provider = new CityGeocodingProvider((async (input) => {
    const where = new URL(String(input)).searchParams.get("where")!;
    assert.ok(where.includes("LIKE '300 %'"));
    assert.ok(where.includes("LIKE '% N %'"));
    return Response.json({ type: "FeatureCollection", features: [] });
  }) as Fetcher);
  assert.deepEqual(await provider.search("300 N MAIN ST"), []);
});
