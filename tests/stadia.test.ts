import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolveRoutingConfiguration,
  STADIA_ROUTING_ENDPOINT,
} from "../lib/routing/config";
import { fetchValhalla, parseValhalla } from "../lib/routing/valhalla";
import { RoutingProviderError } from "../lib/routing/errors";
import { routingFixture, point } from "./fixtures/geometries";
import type { Fetcher } from "../lib/server/http";
import { getLiveRouteComparison } from "../lib/analysis/compare";
import { POST } from "../app/api/compare/route";
import { decodePolyline6, stadiaGeoJSON } from "../lib/routing/stadia";
import { demoLocations } from "../data/demoLocations";

const secret = "test-only-stadia-credential";
const request = { start: point(0), destination: point(1000) };
function checkError(code: string) {
  return (error: unknown) => {
    assert.ok(error instanceof RoutingProviderError);
    assert.equal(error.code, code);
    assert.ok(!String(error).includes(secret));
    assert.equal(error.cause, undefined);
    return true;
  };
}
test("Stadia is selected with a key; production defaults to requiring Stadia; explicit Valhalla stays available", () => {
  for (const NODE_ENV of ["development", "production"]) {
    assert.deepEqual(
      resolveRoutingConfiguration({ NODE_ENV, STADIA_API_KEY: secret }),
      {
        provider: "stadia",
        endpoint: STADIA_ROUTING_ENDPOINT,
        apiKey: secret,
      },
    );
    assert.throws(
      () =>
        resolveRoutingConfiguration({ NODE_ENV, ROUTING_PROVIDER: "stadia" }),
      /STADIA_API_KEY/,
    );
  }
  assert.throws(
    () => resolveRoutingConfiguration({ NODE_ENV: "production" }),
    /STADIA_API_KEY/,
  );
  assert.throws(
    () => resolveRoutingConfiguration({ ROUTING_PROVIDER: "unknown-secret" }),
    (error) => !String(error).includes("unknown-secret"),
  );
  assert.equal(
    resolveRoutingConfiguration({ NODE_ENV: "development" }).provider,
    "valhalla",
  );
  assert.deepEqual(
    resolveRoutingConfiguration({
      NODE_ENV: "production",
      ROUTING_PROVIDER: "valhalla",
      VALHALLA_URL: "https://private.example/route",
      STADIA_API_KEY: secret,
    }),
    {
      provider: "valhalla",
      endpoint: "https://private.example/route",
      apiKey: undefined,
    },
  );
  assert.throws(
    () =>
      resolveRoutingConfiguration({
        ROUTING_PROVIDER: "stadia",
        STADIA_API_KEY: "invalid\nkey",
      }),
    /STADIA_API_KEY/,
  );
});
test("Stadia URL and header auth preserve every existing pedestrian request option and normalized alternatives", async () => {
  const fixture = JSON.parse(
    readFileSync("tests/fixtures/stadia-showcase.json", "utf8"),
  );
  // Recorded multi-alternative response exercises the existing normalization.
  const raw = fixture;
  assert.ok(raw?.routes?.length > 1);
  const trip = {
    start: demoLocations.start.point,
    destination: demoLocations.destination.point,
  };
  let calls = 0;
  const result = await fetchValhalla(
    trip,
    (async (input, init) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.origin + url.pathname, STADIA_ROUTING_ENDPOINT);
      assert.deepEqual([...url.searchParams.keys()], ["json"]);
      assert.ok(!String(input).includes(secret));
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Stadia-Auth ${secret}`,
      );
      assert.equal(init?.redirect, "error");
      assert.equal(init?.cache, "no-store");
      assert.ok(init?.signal);
      assert.deepEqual(JSON.parse(url.searchParams.get("json")!), {
        locations: [trip.start, trip.destination].map(([lat, lon]) => ({
          lat,
          lon,
        })),
        costing: "pedestrian",
        alternates: 2,
        units: "kilometers",
        format: "osrm",
        shape_format: "polyline6",
        directions_type: "none",
      });
      return Response.json(raw);
    }) as Fetcher,
    STADIA_ROUTING_ENDPOINT,
    secret,
  );
  assert.equal(calls, 1);
  assert.deepEqual(
    result,
    parseValhalla(stadiaGeoJSON(raw), STADIA_ROUTING_ENDPOINT),
  );
  assert.equal(result.routes.length, 3);
  assert.equal(result.received, 3);
  assert.deepEqual(result.routes[0].geometry[0], [36.365759, -94.203641]);
  assert.equal(result.routes[0].metrics.seconds, raw.routes[0].duration);
  assert.equal(
    result.routes[0].metrics.providerDistanceMeters,
    raw.routes[0].distance,
  );
  assert.equal(result.routes[0].metrics.minutes, raw.routes[0].duration / 60);
  assert.equal(
    result.routes[0].metrics.miles,
    raw.routes[0].distance / 1609.344,
  );
  assert.ok(!JSON.stringify(result).includes(secret));
});
test("Stadia HTTP and malformed/no-route errors are explicit and never leak upstream text", async () => {
  for (const [status, code] of [
    [401, "ROUTING_AUTHENTICATION_FAILED"],
    [403, "ROUTING_AUTHENTICATION_FAILED"],
    [429, "ROUTING_RATE_LIMITED"],
    [503, "ROUTING_UNAVAILABLE"],
  ] as const) {
    await assert.rejects(
      fetchValhalla(
        request,
        (async () => new Response(secret, { status })) as Fetcher,
        STADIA_ROUTING_ENDPOINT,
        secret,
      ),
      checkError(code),
    );
  }
  for (const body of [
    null,
    {},
    {
      code: "Ok",
      routes: [{ ...routingFixture().routes[0], weight_name: secret }],
    },
    { error: secret },
  ]) {
    await assert.rejects(
      fetchValhalla(
        request,
        (async () => Response.json(body)) as Fetcher,
        STADIA_ROUTING_ENDPOINT,
        secret,
      ),
      checkError("ROUTING_MALFORMED_RESPONSE"),
    );
  }
  await assert.rejects(
    fetchValhalla(
      request,
      (async () => new Response(secret)) as Fetcher,
      STADIA_ROUTING_ENDPOINT,
      secret,
    ),
    checkError("ROUTING_MALFORMED_RESPONSE"),
  );
  for (const body of [
    { code: "NoRoute" },
    { code: "NoSegment" },
    { code: "Ok", routes: [] },
    { error_code: 442, error: secret },
  ]) {
    await assert.rejects(
      fetchValhalla(
        request,
        (async () =>
          Response.json(body, {
            status: "error_code" in body ? 400 : 200,
          })) as Fetcher,
        STADIA_ROUTING_ENDPOINT,
        secret,
      ),
      checkError("ROUTING_NO_ROUTE"),
    );
  }
});
test("routing timeout, network and body-read failures discard secret-bearing diagnostics with no retry/fallback", async () => {
  for (const name of ["TimeoutError", "AbortError", "Error"]) {
    let calls = 0;
    await assert.rejects(
      fetchValhalla(
        request,
        (async () => {
          calls++;
          const error = new Error(secret);
          error.name = name;
          throw error;
        }) as Fetcher,
        STADIA_ROUTING_ENDPOINT,
        secret,
      ),
      checkError(name === "Error" ? "ROUTING_UNAVAILABLE" : "ROUTING_TIMEOUT"),
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(
    fetchValhalla(
      request,
      (async () =>
        Object.assign(Response.json({}), {
          json: async () => {
            throw new DOMException(secret, "TimeoutError");
          },
        })) as Fetcher,
      STADIA_ROUTING_ENDPOINT,
      secret,
    ),
    checkError("ROUTING_TIMEOUT"),
  );
  let calls = 0;
  await assert.rejects(
    fetchValhalla(
      request,
      (async () => {
        calls++;
        return Response.json(routingFixture());
      }) as Fetcher,
      "https://other.example/route",
      secret,
    ),
    checkError("ROUTING_AUTHENTICATION_FAILED"),
  );
  assert.equal(calls, 0);
});
test("safe routing errors survive the analysis layer; no-route retains existing location guidance", async () => {
  for (const code of [
    "ROUTING_AUTHENTICATION_FAILED",
    "ROUTING_RATE_LIMITED",
    "ROUTING_TIMEOUT",
    "ROUTING_MALFORMED_RESPONSE",
    "ROUTING_UNAVAILABLE",
  ] as const) {
    await assert.rejects(
      getLiveRouteComparison(undefined, {
        routing: {
          getCandidates: async () => {
            throw new RoutingProviderError(code);
          },
        },
        inventory: async () => {
          throw new Error("must not fetch GIS");
        },
      }),
      checkError(code),
    );
  }
  await assert.rejects(
    getLiveRouteComparison(undefined, {
      routing: {
        getCandidates: async () => {
          throw new RoutingProviderError("ROUTING_NO_ROUTE");
        },
      },
      inventory: async () => {
        throw new Error("must not fetch GIS");
      },
    }),
    /No walking route was found/,
  );
});
test("application returns actionable sanitized provider errors without logging credentials", async () => {
  const before = { ...process.env };
  const original = globalThis.fetch;
  const originalLog = console.error;
  const logs: unknown[][] = [];
  process.env.ROUTING_PROVIDER = "stadia";
  process.env.STADIA_API_KEY = secret;
  globalThis.fetch = (async () =>
    new Response(secret, { status: 401 })) as Fetcher;
  console.error = (...args) => {
    logs.push(args);
  };
  try {
    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          start: { label: "Test start", point: point(17, 19) },
          destination: { label: "Test destination", point: point(901, 29) },
        }),
      }),
    );
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.code, "ROUTING_AUTHENTICATION_FAILED");
    assert.match(body.error, /authentication failed/);
    assert.ok(!JSON.stringify({ body, logs }).includes(secret));
  } finally {
    globalThis.fetch = original;
    console.error = originalLog;
    for (const name of ["ROUTING_PROVIDER", "STADIA_API_KEY"]) {
      if (before[name] === undefined) delete process.env[name];
      else process.env[name] = before[name];
    }
  }
});

test("polyline6 decoding preserves axis order/precision and fails closed on malformed geometry", () => {
  assert.deepEqual(decodePolyline6("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [
    [-12.02, 3.85],
    [-12.095, 4.07],
    [-12.6453, 4.3252],
  ]);
  for (const shape of ["", "?", "_", "~~~~~~~~~~~~", "\u0000", "?\uFFFF"]) {
    assert.throws(
      () => decodePolyline6(shape),
      checkError("ROUTING_MALFORMED_RESPONSE"),
    );
  }
});
