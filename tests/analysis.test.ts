import { test } from "node:test";
import assert from "node:assert/strict";
import { routeLengthMeters } from "../lib/analysis/geometry";
import {
  measureCoverage,
  groupGaps,
  mergeIntervals,
} from "../lib/analysis/coverage";
import { pathsafeScore } from "../lib/scoring/pathsafeScore";
import { recommendRoute } from "../lib/scoring/recommendation";
import {
  deduplicateRoutes,
  geometricallyEquivalent,
} from "../lib/routing/deduplicate";
import { point, facility, candidate } from "./fixtures/geometries";
const close = (actual: number, expected: number, tolerance = 0.05) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} expected ${expected}`,
  );
test("geodesic length is measured in meters and rejects invalid routes", () => {
  close(routeLengthMeters([point(0), point(1000)]), 1000, 0.1);
  assert.throws(() =>
    routeLengthMeters([
      [0, 0],
      [NaN, 0],
    ]),
  );
  assert.throws(() =>
    routeLengthMeters([
      [0, 0],
      [0, 0],
    ]),
  );
});
test("empty infrastructure produces 0% mapped coverage, not a claim of absent sidewalks", () => {
  const result = measureCoverage([point(0), point(100)], []);
  assert.equal(result.coverage, 0);
  assert.equal(result.coveredMeters, 0);
  assert.equal(result.gaps, 1);
  close(result.uncoveredMeters, 100);
});
test("100% coverage with coincident facilities and no duplicate counting", () => {
  const result = measureCoverage(
    [point(0), point(100)],
    [facility(0, 100), facility(0, 100)],
  );
  close(result.coverage, 100);
  assert.equal(result.gaps, 0);
  close(result.coveredMeters, result.lengthMeters);
});
test("15m buffer accepts offset lines, excludes lines beyond tolerance", () => {
  close(
    measureCoverage([point(0), point(100)], [facility(0, 100, 10)]).coverage,
    100,
  );
  close(
    measureCoverage([point(0), point(100)], [facility(0, 100, 20)]).coverage,
    0,
  );
});
test("capsule endpoints and overlapping buffers union correctly", () => {
  const r = measureCoverage(
    [point(0), point(100)],
    [facility(30, 40), facility(50, 60)],
  );
  close(r.coverage, 60);
  close(r.coveredMeters + r.uncoveredMeters, r.lengthMeters);
  assert.equal(r.gaps, 1);
});
test("perpendicular intersections include buffer width", () => {
  const f = facility(50, 50);
  f.geometry = [point(50, -50), point(50, 50)];
  close(measureCoverage([point(0), point(100)], [f]).coverage, 30);
});
test("meaningful gaps ignore tiny artifacts and bridge <=5m covered islands", () => {
  assert.equal(
    groupGaps([
      [0, 5],
      [25, 35],
    ]).length,
    0,
  );
  assert.equal(
    groupGaps([
      [0, 12],
      [15, 27],
    ]).length,
    1,
  );
  assert.equal(
    groupGaps([
      [0, 21],
      [27, 50],
    ]).length,
    2,
  );
  assert.equal(groupGaps([[0, 20]]).length, 1);
  assert.deepEqual(
    mergeIntervals([
      [5, 10],
      [0, 7],
      [20, 30],
    ]),
    [
      [0, 10],
      [20, 30],
    ],
  );
});
test("gap grouping does not change coverage and crosses route vertices", () => {
  const result = measureCoverage(
    [point(0), point(50), point(100)],
    [facility(0, 10), facility(90, 100)],
  );
  close(result.coverage, 50);
  assert.equal(result.gaps, 1);
});
test("excluded infrastructure is not counted; corrupt eligible geometry fails closed", () => {
  assert.equal(
    measureCoverage([point(0), point(100)], [facility(0, 100, 0, false)])
      .coverage,
    0,
  );
  assert.throws(
    () =>
      measureCoverage(
        [point(0), point(100)],
        [
          {
            geometry: [
              [NaN, 0],
              [0, 0],
            ],
            eligible: true,
          },
        ],
      ),
    /Invalid infrastructure/,
  );
});
test("score implements the exact penalties, rounding, and caps", () => {
  assert.equal(
    pathsafeScore({
      coverage: 100,
      gaps: 0,
      lengthMeters: 1000,
      shortestMeters: 1000,
    }),
    100,
  );
  assert.equal(
    pathsafeScore({
      coverage: 80,
      gaps: 3,
      lengthMeters: 1300,
      shortestMeters: 1000,
    }),
    72,
  );
  assert.equal(
    pathsafeScore({
      coverage: 0,
      gaps: 100,
      lengthMeters: 4000,
      shortestMeters: 1000,
    }),
    0,
  );
  assert.equal(
    pathsafeScore({
      coverage: 100,
      gaps: 20,
      lengthMeters: 4000,
      shortestMeters: 1000,
    }),
    70,
  );
  assert.throws(() =>
    pathsafeScore({
      coverage: 101,
      gaps: 0,
      lengthMeters: 1000,
      shortestMeters: 1000,
    }),
  );
});
test("recommend alternative only for material improvement within every travel bound", () => {
  const f = candidate("fastest", 50, 600, 1000);
  const a = candidate("alt", 65, 720, 1200);
  assert.equal(recommendRoute([f, a]).routeId, "alt");
  for (const bad of [
    candidate("alt", 59, 620, 1100),
    candidate("alt", 90, 760, 1200),
    candidate("alt", 90, 700, 1260),
    candidate("alt", 90, 960, 1200),
    candidate("alt", 65, 720, 1200, 40),
  ])
    assert.equal(recommendRoute([f, bad]).routeId, "fastest");
});
test("absolute 5-minute cost bound still applies on long trips", () => {
  assert.equal(
    recommendRoute([
      candidate("f", 50, 2000, 2500),
      candidate("a", 80, 2301, 2700),
    ]).routeId,
    "f",
  );
});
test("similar routes prefer speed; a single route is not a fabricated comparison", () => {
  const f = candidate("f", 70),
    a = candidate("a", 74, 650);
  assert.match(recommendRoute([f, a]).explanation, /similar/);
  assert.match(recommendRoute([f]).explanation, /Only one/);
  assert.throws(() => recommendRoute([]));
});
test("dedup handles reversed/densified equal geometry and preserves real divergences", () => {
  const f = candidate("f", 50),
    same = { ...f, id: "same", geometry: [point(1000), point(500), point(0)] };
  const other = {
    ...f,
    id: "other",
    geometry: [point(0), point(500, 100), point(1000)],
  };
  assert.ok(geometricallyEquivalent(f, same));
  assert.equal(deduplicateRoutes([f, same, other]).length, 2);
});
