import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  recommendationStory,
  addedTimeLabel,
} from "../lib/presentation/recommendation";
import { resolveRoutingEndpoint, publicRoutingEndpoint } from "../lib/config";
import type { RouteComparison } from "../types/routes";
const captured: RouteComparison = JSON.parse(
  readFileSync(
    new URL("../data/verification/live-comparison.json", import.meta.url),
    "utf8",
  ),
);
test("tradeoff story is computed from full-precision live metrics", () => {
  const story = recommendationStory(captured);
  assert.match(
    story.headline,
    /About 17 seconds longer for nearly 15 percentage points/,
  );
  assert.match(story.explanation, /from 50.6% to 65.5%/);
  assert.ok(story.factors.includes("Fewer meaningful infrastructure gaps"));
  const changed = structuredClone(captured);
  changed.routes[1].metrics.seconds = changed.routes[0].metrics.seconds! + 42;
  changed.routes[1].metrics.coverage = 72;
  const dynamic = recommendationStory(changed);
  assert.match(dynamic.headline, /42 seconds/);
  assert.match(dynamic.explanation, /72.0%/);
});
test("mock and single-candidate stories do not invent live tradeoffs", () => {
  assert.doesNotMatch(
    recommendationStory({ ...captured, source: "mock" }).headline,
    /17 seconds/,
  );
  const single = {
    ...captured,
    routes: [captured.routes[0]],
    recommendation: {
      routeId: "fastest",
      explanation: "One route only",
      factors: [],
    },
  };
  assert.equal(
    recommendationStory(single).headline,
    "One walking route available.",
  );
  assert.equal(addedTimeLabel(1), "1 second");
  assert.equal(addedTimeLabel(120), "2.0 minutes");
});
test("production blocks missing, public-demo, insecure, or malformed routing configuration", () => {
  for (const value of [
    undefined,
    "",
    "https://valhalla1.openstreetmap.de/route",
    "http://routing.example/route",
    "invalid",
    "https://private.example/status",
    "https://user:secret@private.example/route",
  ])
    assert.throws(() =>
      resolveRoutingEndpoint({ NODE_ENV: "production", VALHALLA_URL: value }),
    );
  assert.equal(
    resolveRoutingEndpoint({
      NODE_ENV: "production",
      VALHALLA_URL: "https://private.example/route",
    }),
    "https://private.example/route",
  );
  assert.match(
    resolveRoutingEndpoint({ NODE_ENV: "development" }),
    /valhalla1.openstreetmap.de/,
  );
});
test("routing provenance never exposes provider query secrets", () => {
  assert.equal(
    publicRoutingEndpoint("https://private.example/route?key=secret"),
    "https://private.example/route",
  );
});

test("CAC story uses live deltas and approved default matches verified City pair", () => {
  const comparison: RouteComparison = JSON.parse(
    readFileSync("data/verification/cac-live-comparison.json", "utf8"),
  );
  const story = recommendationStory(comparison);
  assert.equal(
    story.headline,
    "About 5 seconds longer for over 21 percentage points more mapped pedestrian infrastructure coverage.",
  );
  assert.ok(story.factors.includes("Fewer meaningful infrastructure gaps"));
  assert.ok(story.factors.includes("Minimal additional travel time"));
  const changed = structuredClone(comparison);
  changed.routes[1].metrics.seconds = changed.routes[0].metrics.seconds! + 32;
  changed.routes[1].metrics.coverage = 86;
  assert.match(
    recommendationStory(changed).headline,
    /32 seconds longer for 11.4 percentage points/,
  );
  assert.doesNotMatch(story.headline + story.explanation, /safer/i);
});
