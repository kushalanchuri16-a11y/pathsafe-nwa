import { demoLocations, isDemoPair } from "../data/demoLocations";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { getRouteComparison } from "../lib/routes";
const endpoints = {
  source: "mock" as const,
  start: "Austin-Baggett Park",
  destination: "Lawrence Plaza",
};
test("provider exposes the specified comparison and isolated fixture copies", async () => {
  const result = await getRouteComparison(endpoints);
  assert.ok(result);
  assert.equal(result.source, "mock");
  assert.deepEqual(
    result.routes.map((r) => r.metrics),
    [
      { minutes: 17, miles: 0.9, coverage: 75, gaps: 3, score: 70 },
      { minutes: 17.1, miles: 0.9, coverage: 96, gaps: 1, score: 95 },
    ],
  );
  result.routes[0].metrics.coverage = 0;
  assert.equal(
    (await getRouteComparison(endpoints))?.routes[0].metrics.coverage,
    75,
  );
});
test("unknown endpoints do not silently reuse the fixed demo trip", async () => {
  assert.equal(
    await getRouteComparison({ ...endpoints, start: "Another address" }),
    null,
  );
});
test("validation and deterministic failure scenarios", async () => {
  await assert.rejects(
    getRouteComparison({ ...endpoints, start: "" }),
    /Choose both/,
  );
  assert.equal(
    await getRouteComparison({ ...endpoints, scenario: "no-route" }),
    null,
  );
  await assert.rejects(
    getRouteComparison({ ...endpoints, scenario: "error" }),
    /could not be loaded/,
  );
});

test("approved fixed demo uses exact official pair-20 points and rejects former/unknown live trips", () => {
  const pair = JSON.parse(
    readFileSync("data/demo-search/verified-pairs.json", "utf8"),
  ).pairs.find((p: { id: string }) => p.id === "pair-20");
  assert.deepEqual(demoLocations.start.point, pair.start.point);
  assert.deepEqual(demoLocations.destination.point, pair.destination.point);
  assert.equal(demoLocations.start.objectId, 5);
  assert.equal(demoLocations.destination.objectId, 67);
  assert.ok(isDemoPair("Austin-Baggett Park", "Lawrence Plaza"));
  assert.equal(
    isDemoPair("Bentonville High School", "Bentonville Public Library"),
    false,
  );
});
