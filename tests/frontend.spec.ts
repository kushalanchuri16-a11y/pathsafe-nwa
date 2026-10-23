import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { RouteComparison } from "../types/routes";
const live = JSON.parse(
  readFileSync(
    new URL("../data/verification/cac-live-comparison.json", import.meta.url),
    "utf8",
  ),
) as RouteComparison;
test("live results, route highlighting, methodology, explicit failures and mock fallback", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/compare", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({ json: { comparison: live } });
  });
  await page.goto("/");
  await expect(page).toHaveTitle(
    "PathSafe NWA | Infrastructure-Aware Walking Routes",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Compare Bentonville walking routes using mapped pedestrian infrastructure coverage.",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /opengraph-image/,
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    /icon.svg/,
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "pedestrian infrastructure",
  );
  await expect(page.getByText("96%", { exact: true })).toBeVisible();
  await page.goto("/app");
  await expect(
    page.getByText("Every walk has a few possibilities."),
  ).toBeVisible();
  await expect(page.getByLabel("Starting point", { exact: true })).toHaveValue(
    "Austin-Baggett Park",
  );
  await expect(page.getByLabel("Destination", { exact: true })).toHaveValue(
    "Lawrence Plaza",
  );
  await page.getByRole("button", { name: "Compare routes" }).click();
  await expect(
    page.getByText("Preparing your route comparison…"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /PathSafe Route/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".results")).toContainText("74.64%");
  await expect(page.locator(".results")).toContainText("96.39%");
  await expect(page.locator(".results")).toContainText("REAL DATA · V1");
  await expect(page.locator(".results")).not.toContainText("MOCK DATA");
  await expect(page.locator(".results")).not.toContainText("75%");
  await expect(page.locator(".results")).not.toContainText("96%");
  await expect(page.locator(".recommendation h3")).toContainText(
    "over 21 percentage points",
  );
  await page
    .getByText("View 1 more walking alternative", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Alternative 2/ }),
  ).toBeVisible();
  const fastest = page.getByRole("button", { name: /Fastest Route/ });
  await page
    .getByText("Why is this route recommended?", { exact: true })
    .click();
  await expect(page.locator(".recommendation")).toContainText("5 seconds");
  await fastest.click();
  await expect(fastest).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator('path[stroke="#64748b"][stroke-width="7"]'),
  ).toBeVisible();
  await expect(page.locator(".map-caption")).toContainText(
    "City of Bentonville GIS",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `test-results/cac-fixture-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Methodology & data limitations" })
    .click();
  await expect(
    page.getByRole("heading", { name: "What PathSafe does not measure" }),
  ).toBeVisible();
  await expect(page.locator(".technical-details")).not.toHaveAttribute("open");
  await page.locator(".technical-details > summary").click();
  await expect(
    page.getByRole("heading", { name: "Geometry matching" }),
  ).toBeVisible();
  await page.goto("/app");
  await page.unroute("**/api/compare");
  await page.route("**/api/compare", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Live route analysis is temporarily unavailable." },
    }),
  );
  await page.getByRole("button", { name: "Compare routes" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Live route analysis is temporarily unavailable.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".route-card")).toHaveCount(0);
  await page.getByRole("button", { name: "View demo data" }).click();
  await expect(page.getByLabel("Analysis source")).toHaveValue("mock");
  await expect(
    page.getByRole("button", { name: /PathSafe Route/ }),
  ).toBeVisible();
  await expect(page.locator(".results")).toContainText("MOCK DATA");
  await page.getByText("Prototype state controls").click();
  await page.getByLabel("Next comparison result").selectOption("no-route");
  await page.getByRole("button", { name: "Compare routes" }).click();
  await expect(
    page.getByRole("heading", { name: "No demo route available" }),
  ).toBeVisible();
  await page.getByLabel("Next comparison result").selectOption("error");
  await page.getByRole("button", { name: "Compare routes" }).click();
  await expect(
    page.getByRole("heading", { name: "Comparison unavailable" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("single provider candidate is shown without fabricated alternative", async ({
  page,
}) => {
  const single = {
    ...live,
    routes: [{ ...live.routes[0], recommended: false }],
    recommendation: {
      routeId: "fastest",
      explanation:
        "Only one distinct walking route was returned. No alternative comparison is available.",
      factors: ["One provider route; no fabricated alternative"],
    },
  };
  await page.route("**/api/compare", (r) =>
    r.fulfill({ json: { comparison: single } }),
  );
  await page.goto("/app");
  await page.getByRole("button", { name: "Compare routes" }).click();
  await expect(page.locator(".route-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "One route available" }),
  ).toBeVisible();
  await expect(page.locator(".recommended")).toHaveCount(0);
});
