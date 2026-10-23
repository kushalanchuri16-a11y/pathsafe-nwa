import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchBentonville,
  normalizeFeatures,
  classifyInfrastructure,
  GIS_FIELDS,
} from "../lib/gis/bentonville";
import { fetchValhalla, parseValhalla } from "../lib/routing/valhalla";
import { getRouteComparison } from "../lib/routes";
import { POST } from "../app/api/compare/route";
import { gisFeature, routingFixture, point } from "./fixtures/geometries";
import type { Fetcher } from "../lib/server/http";
const bounds: [number, number, number, number] = [-94.21, 36.35, -94.19, 36.37];
function fake(handler: (url: URL, init?: RequestInit) => unknown): Fetcher {
  return (async (input, init) =>
    new Response(JSON.stringify(handler(new URL(String(input)), init)), {
      status: 200,
    })) as Fetcher;
}
test("GIS fetch batches exact IDs below the record limit and requests WGS84/minimal fields", async () => {
  let calls = 0;
  const ids = Array.from({ length: 501 }, (_, i) => i + 1);
  const result = await fetchBentonville(
    bounds,
    fake((url) => {
      calls++;
      if (url.searchParams.get("returnIdsOnly")) return { objectIds: ids };
      assert.equal(url.searchParams.get("outSR"), "4326");
      assert.equal(url.searchParams.get("outFields"), GIS_FIELDS.join(","));
      const chunk = url.searchParams.get("objectIds")!.split(",").map(Number);
      assert.ok(chunk.length <= 250);
      return {
        type: "FeatureCollection",
        features: chunk.map((id) => gisFeature(id)),
      };
    }),
  );
  assert.equal(calls, 4);
  assert.equal(result.featureCount, 501);
});
test("empty nearby GIS inventory remains explicit and measurable as 0%", async () => {
  const result = await fetchBentonville(
    bounds,
    fake(() => ({ objectIds: [] })),
  );
  assert.equal(result.featureCount, 0);
  assert.match(result.warnings[0], /does not establish/);
});
test("partial, duplicate, truncated, and invalid GIS responses fail closed", async () => {
  for (const response of [
    { type: "FeatureCollection", features: [] },
    { type: "FeatureCollection", features: [gisFeature(2)] },
    {
      type: "FeatureCollection",
      features: [gisFeature()],
      exceededTransferLimit: true,
    },
  ])
    await assert.rejects(
      fetchBentonville(
        bounds,
        fake((url) =>
          url.searchParams.get("returnIdsOnly") ? { objectIds: [1] } : response,
        ),
      ),
    );
  assert.throws(() =>
    normalizeFeatures([
      {
        properties: { OBJECTID: 1 },
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 1],
          ],
        },
      },
    ]),
  );
});
test("facility mapping is conservative about type, public access, and closures", () => {
  const p = gisFeature().properties;
  assert.ok(classifyInfrastructure(p).eligible);
  assert.equal(
    classifyInfrastructure({ ...p, bikesallow: "Bike Only" }).eligible,
    false,
  );
  assert.equal(
    classifyInfrastructure({ ...p, useaccess: "Restricted" }).eligible,
    false,
  );
  assert.equal(
    classifyInfrastructure({ ...p, useaccess: null }).eligible,
    false,
  );
  assert.equal(
    classifyInfrastructure({ ...p, Closure_Status: "CLOSED" }).eligible,
    false,
  );
  assert.equal(
    classifyInfrastructure({ ...p, trltyptxt: "Painted Cross" }).kind,
    "crossing",
  );
  assert.equal(
    classifyInfrastructure({ ...p, trltyptxt: "Painted Cross" }).eligible,
    false,
  );
  assert.equal(
    classifyInfrastructure({ ...p, facdescrip: "Razorback Greenway" }).kind,
    "trail",
  );
  assert.equal(
    classifyInfrastructure({ ...p, facdescrip: "Shared Roadway" }).eligible,
    false,
  );
});
test("multi-part GIS lines preserve separate paths", () => {
  const f = gisFeature();
  const result = normalizeFeatures([
    {
      ...f,
      geometry: {
        type: "MultiLineString",
        coordinates: [f.geometry.coordinates, f.geometry.coordinates],
      },
    },
  ]);
  assert.equal(result.featureCount, 1);
  assert.equal(result.segments.length, 2);
  assert.notEqual(result.segments[0].id, result.segments[1].id);
});
test("routing requests pedestrian alternatives and normalizes GeoJSON without inventing a second route", async () => {
  const result = await fetchValhalla(
    { start: point(0), destination: point(1000) },
    fake((url, init) => {
      const input = JSON.parse(url.searchParams.get("json")!);
      assert.equal(input.costing, "pedestrian");
      assert.equal(input.alternates, 2);
      assert.equal(input.shape_format, "geojson");
      assert.equal(
        (init?.headers as Record<string, string>)["X-Client-Id"],
        "PathSafe-NWA-development",
      );
      return routingFixture();
    }),
  );
  assert.equal(result.routes.length, 1);
  assert.match(result.warnings[0], /No distinct alternative/);
  assert.deepEqual(result.routes[0].geometry[0], point(0));
});
test("invalid routing geometries, distances and modes are rejected", () => {
  for (const field of ["duration", "distance"]) {
    const data = routingFixture();
    Object.assign(data.routes[0], { [field]: -1 });
    assert.throws(() => parseValhalla(data, "test"));
  }
  const bad = routingFixture();
  bad.routes[0].weight_name = "auto";
  assert.throws(() => parseValhalla(bad, "test"));
  assert.throws(() => parseValhalla({ code: "Ok", routes: [] }, "test"));
});
test("upstream network, timeout, API and HTTP errors propagate with no mock substitution", async () => {
  for (const fetcher of [
    (async () => {
      throw new Error("network down");
    }) as Fetcher,
    (async () => {
      throw new DOMException("timeout", "TimeoutError");
    }) as Fetcher,
    fake(() => ({ error: { code: 500 } })),
    (async () => new Response("Unavailable", { status: 503 })) as Fetcher,
  ]) {
    await assert.rejects(fetchBentonville(bounds, fetcher));
    await assert.rejects(
      fetchValhalla({ start: point(0), destination: point(1000) }, fetcher),
    );
  }
});
test("live client errors never become mock successes", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json(
      { error: "Live route analysis is temporarily unavailable." },
      { status: 503 },
    )) as Fetcher;
  try {
    await assert.rejects(
      getRouteComparison({
        start: "Austin-Baggett Park",
        destination: "Lawrence Plaza",
      }),
      /Live route analysis is temporarily unavailable/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("API rejects unknown endpoints and reports unavailable production configuration without network", async () => {
  const invalid = await POST(
    new Request("http://localhost/api/compare", {
      method: "POST",
      body: JSON.stringify({ start: "Elsewhere", destination: "Other" }),
    }),
  );
  assert.equal(invalid.status, 400);
  const before = { node: process.env.NODE_ENV, url: process.env.VALHALLA_URL };
  Object.assign(process.env, { NODE_ENV: "production" });
  delete process.env.VALHALLA_URL;
  try {
    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          start: "Austin-Baggett Park",
          destination: "Lawrence Plaza",
        }),
      }),
    );
    assert.equal(response.status, 503);
    assert.match(
      (await response.json()).error,
      /Live route analysis is temporarily unavailable/,
    );
  } finally {
    if (before.node === undefined)
      Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: before.node });
    if (before.url !== undefined) process.env.VALHALLA_URL = before.url;
  }
});

test("malformed route coordinates fail before analysis", () => {
  const invalid = routingFixture();
  invalid.routes[0].geometry.coordinates = [
    [0, 0],
    [NaN, 1],
  ];
  assert.throws(() => parseValhalla(invalid, "test"));
});
