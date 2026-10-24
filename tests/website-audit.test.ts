import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import RouteCard from "../components/RouteCard";
import { getRouteComparison } from "../lib/routes";
import type { RouteComparison } from "../types/routes";
const c: RouteComparison = JSON.parse(
  readFileSync("data/verification/cac-live-comparison.json", "utf8"),
);
test("route cards use singular gap wording only for one gap", () => {
  for (const gaps of [0, 1, 2]) {
    const route = { ...c.routes[0], metrics: { ...c.routes[0].metrics, gaps } };
    const html = renderToStaticMarkup(
      createElement(RouteCard, { route, selected: false, onSelect: () => {} }),
    );
    assert.ok(
      html.includes(
        `${gaps} meaningful mapped-coverage gap${gaps === 1 ? "" : "s"}`,
      ),
    );
  }
});
test("gateway HTML and malformed comparison JSON stay unavailable instead of leaking parser errors or becoming no-route", async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [
      () => new Response("<html>Bad gateway</html>", { status: 502 }),
      () => Response.json({}),
      () => Response.json({ comparison: { source: "mock", routes: [{}] } }),
    ]) {
      globalThis.fetch = (async () => response()) as typeof fetch;
      await assert.rejects(
        getRouteComparison({
          start: "Austin-Baggett Park",
          destination: "Lawrence Plaza",
        }),
        /Live route analysis is temporarily unavailable/,
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});
