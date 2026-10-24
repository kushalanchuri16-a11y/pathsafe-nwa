import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  supportedCandidates,
  RouteBoundaryError,
} from "../lib/geocoding/supportedRoutes";
import {
  isWithinSupportedArea,
  lineWithinArea,
  type Polygon,
} from "../lib/geocoding/area";
import {
  CityGeocodingProvider,
  normalizeCityResults,
} from "../lib/geocoding/city";
import { parseValhalla, fetchValhalla } from "../lib/routing/valhalla";
import { getLiveRouteComparison } from "../lib/analysis/compare";
import type { RouteCandidate } from "../types/routes";
import type { Fetcher } from "../lib/server/http";
import { candidate, point, routingFixture } from "./fixtures/geometries";
const reported = JSON.parse(
  readFileSync("data/reliability/reported-routing.json", "utf8"),
);
test("reported Mistletoe/Crystal endpoints and snaps are valid; enclave-crossing candidate alone is excluded", () => {
  assert.ok(
    isWithinSupportedArea(...(reported.start.point as [number, number])),
  );
  assert.ok(
    isWithinSupportedArea(...(reported.destination.point as [number, number])),
  );
  const original = reported.routing.result.routes as RouteCandidate[],
    snapshot = JSON.stringify(original);
  assert.equal(lineWithinArea(original[0].geometry), false);
  assert.ok(original.slice(1).every((r) => lineWithinArea(r.geometry)));
  const result = supportedCandidates(original);
  assert.equal(result.excluded, 1);
  assert.equal(result.routes.length, 2);
  assert.equal(result.routes[0].id, "fastest");
  assert.equal(result.routes[1].id, "pathsafe");
  assert.deepEqual(result.routes[0].geometry, original[1].geometry);
  assert.deepEqual(result.routes[1].geometry, original[2].geometry);
  assert.equal(
    JSON.stringify(original),
    snapshot,
    "cached provider candidates must not be mutated",
  );
});
test("no tolerated outside distance: tiny exits, meaningful exits and outside endpoints stay rejected", () => {
  const area: Polygon[] = [
    [
      [
        [0, 0],
        [0.01, 0],
        [0.01, 0.01],
        [0, 0.01],
        [0, 0],
      ],
    ],
  ];
  assert.ok(
    lineWithinArea(
      [
        [0.005, 0.001],
        [0.005, 0.009],
      ],
      area,
    ),
  );
  assert.equal(
    lineWithinArea(
      [
        [0.005, 0.009],
        [0.005, 0.010001],
        [0.005, 0.009],
      ],
      area,
    ),
    false,
  );
  assert.equal(
    lineWithinArea(
      [
        [0.005, 0.009],
        [0.005, 0.02],
        [0.005, 0.009],
      ],
      area,
    ),
    false,
  );
  assert.equal(
    lineWithinArea(
      [
        [0.005, 0.02],
        [0.005, 0.009],
      ],
      area,
    ),
    false,
  );
  assert.throws(
    () => supportedCandidates([reported.routing.result.routes[0]]),
    RouteBoundaryError,
  );
});
test("normal showcase remains unchanged and a lone supported route is not fabricated into alternatives", () => {
  const c = JSON.parse(
    readFileSync("data/verification/cac-live-comparison.json", "utf8"),
  );
  assert.equal(supportedCandidates(c.routes).excluded, 0);
  const result = supportedCandidates([c.routes[0]]);
  assert.equal(result.routes.length, 1);
  assert.equal(result.routes[0].recommended, false);
});
test("municipal-airport alias uses verified public City record, never XNA", async () => {
  const source = JSON.parse(
    readFileSync("data/reliability/airport-official-records.json", "utf8"),
  ).features.find(
    (f: { properties: { OBJECTID: number } }) => f.properties.OBJECTID === 124,
  );
  const provider = new CityGeocodingProvider((async (input) =>
    Response.json({
      type: "FeatureCollection",
      features: new URL(String(input)).searchParams
        .get("where")
        ?.includes("STATUS = 'PERMANENT'")
        ? [source]
        : [],
    })) as Fetcher);
  const airport = await provider.search("Bentonville Municipal Airport");
  assert.equal(airport.length, 1);
  assert.ok(isWithinSupportedArea(...airport[0].point));
  assert.match(airport[0].label, /Thaden Field House/);
  assert.deepEqual(await provider.search("XNA"), []);
  assert.equal(
    isWithinSupportedArea(
      36 + 16 / 60 + 54.73 / 3600,
      -(94 + 18 / 60 + 24.52 / 3600),
    ),
    false,
  );
});
test("expanded address words and punctuation use the same official address tokens", async () => {
  const provider = new CityGeocodingProvider((async (input) => {
    const where = new URL(String(input)).searchParams.get("where")!;
    assert.match(where, /'3809 %'/);
    assert.ok(
      !where.includes("MISTLETOE"),
      "local ranking handles expanded words within exact-number candidates",
    );
    return Response.json({ type: "FeatureCollection", features: [] });
  }) as Fetcher);
  await provider.search(" 3809 Southwest Mistletoe Avenue., Bentonville, AR ");
});
test("equivalent named-place aliases at one address/point collapse; distinct locations remain", () => {
  const feature = (id: number, name: string, lon = -94.2085) => ({
    properties: { OBJECTID: id, COMMON_NAME: name, ADDRESS: "405 S MAIN ST" },
    geometry: { type: "Point", coordinates: [lon, 36.3677] },
  });
  assert.equal(
    normalizeCityResults(
      [
        feature(1, "Library"),
        feature(2, "Public Library"),
        feature(3, "Other library", -94.208),
      ],
      "place",
    ).length,
    2,
  );
});
test("malformed provider responses are unavailable, not a false no-route/location error", () => {
  for (const body of [
    null,
    {},
    { code: "BadRequest" },
    { code: "Ok", routes: null },
  ])
    assert.throws(
      () => parseValhalla(body, "fixture"),
      /Invalid walking routing response/,
    );
  assert.throws(
    () => parseValhalla({ code: "NoRoute" }, "fixture"),
    /no walking route/,
  );
});
test("invalid snapped endpoints fail with an accurate walking-network message", async () => {
  await assert.rejects(
    fetchValhalla({ start: point(300), destination: point(1000) }, (async () =>
      Response.json(routingFixture())) as Fetcher),
    /snapped more than 100m/,
  );
  await assert.rejects(
    getLiveRouteComparison(undefined, {
      routing: {
        getCandidates: async () => {
          throw new Error(
            "Routing endpoint snapped more than 100m from the verified location.",
          );
        },
      },
      inventory: async () => {
        throw new Error("should not query GIS");
      },
    }),
    /walking network within 100 meters/,
  );
});
test("very short walking routes and a close-endpoint input are distinguished", () => {
  const c = candidate("short", 0, 25, 30);
  assert.ok(lineWithinArea(c.geometry));
  assert.equal(supportedCandidates([c]).routes.length, 1);
});

test("ArcGIS explicit null IDs require a separately confirmed zero count; missing/contradictory inventories fail", async () => {
  const { confirmedInventoryIds } = await import("../lib/gis/inventoryIds");
  const url = new URL(
      "https://official.example/query?returnIdsOnly=true&where=Public",
    ),
    signal = AbortSignal.timeout(1000);
  for (const count of [0, 1, undefined]) {
    const fetcher = (async (input) => {
      const q = new URL(String(input));
      assert.equal(q.searchParams.get("returnCountOnly"), "true");
      assert.equal(q.searchParams.get("where"), "Public");
      return Response.json({ count });
    }) as Fetcher;
    const request = confirmedInventoryIds(
      { objectIdFieldName: "OBJECTID", objectIds: null },
      url,
      signal,
      fetcher,
      1000,
    );
    if (count === 0) assert.deepEqual(await request, []);
    else await assert.rejects(request, /confirmed zero/);
  }
  await assert.rejects(
    confirmedInventoryIds({}, url, signal, fetch, 1000),
    /Incomplete/,
  );
  await assert.rejects(
    confirmedInventoryIds({ objectIds: null }, url, signal, fetch, 1000),
    /Incomplete/,
  );
});
test("empty confirmed City trail/sidewalk inventories remain valid without loosening eligibility", async () => {
  const { fetchOfficialTrails } =
    await import("../lib/gis/pedestrianInventory");
  const { fetchBentonville } = await import("../lib/gis/bentonville");
  const fetcher = (async (input) =>
    Response.json(
      new URL(String(input)).searchParams.has("returnCountOnly")
        ? { count: 0 }
        : { objectIdFieldName: "OBJECTID", objectIds: null },
    )) as Fetcher;
  for (const loader of [fetchOfficialTrails, fetchBentonville])
    assert.equal(
      (await loader([-94.21, 36.35, -94.19, 36.37], fetcher)).segments.length,
      0,
    );
});
test("eligibility and normalization source regions remain byte-identical through retrieval repair", async () => {
  const { createHash } = await import("node:crypto");
  const hashes = JSON.parse(
    readFileSync("data/reliability/eligibility-hashes.json", "utf8"),
  );
  const s = readFileSync("lib/gis/bentonville.ts", "utf8"),
    t = readFileSync("lib/gis/pedestrianInventory.ts", "utf8");
  assert.equal(
    createHash("sha256")
      .update(
        s.slice(
          s.indexOf("export function classifyInfrastructure"),
          s.indexOf("export async function fetchBentonville"),
        ),
      )
      .digest("hex"),
    hashes.baselineEligibility,
  );
  assert.equal(
    createHash("sha256")
      .update(
        t.slice(
          t.indexOf("export function normalizeTrailFeatures"),
          t.indexOf("export async function fetchOfficialTrails"),
        ),
      )
      .digest("hex"),
    hashes.trailNormalization,
  );
});
