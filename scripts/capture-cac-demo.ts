import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { demoLocations } from "../data/demoLocations";
import { recommendationStory } from "../lib/presentation/recommendation";
import { measureCoverage } from "../lib/analysis/coverage";
import type { RouteComparison } from "../types/routes";
const browser = await chromium.launch();
await mkdir("docs/screenshots/cac", { recursive: true });
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ] as const) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:3000/");
    await page.getByText("96%", { exact: true }).waitFor();
    assert.ok(await page.getByText("MOCK DATA", { exact: true }).isVisible());
    await page.locator(".leaflet-overlay-pane path").first().waitFor();
    await page.locator(".leaflet-tile-loaded").first().waitFor();
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `docs/screenshots/cac/landing-${name}.png`,
      fullPage: true,
    });
    await page.goto("http://localhost:3000/app");
    assert.equal(
      await page.getByLabel("Starting point", { exact: true }).inputValue(),
      demoLocations.start.label,
    );
    assert.equal(
      await page.getByLabel("Destination", { exact: true }).inputValue(),
      demoLocations.destination.label,
    );
    const responsePromise = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/compare") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Compare routes" }).click();
    const response = await responsePromise;
    assert.ok(response.ok());
    const { comparison } = (await response.json()) as {
      comparison: RouteComparison;
    };
    assert.equal(comparison.source, "live");
    assert.equal(comparison.start.label, demoLocations.start.label);
    assert.equal(comparison.destination.label, demoLocations.destination.label);
    await page.getByText("REAL DATA · V1", { exact: true }).waitFor();
    const story = recommendationStory(comparison);
    assert.equal(
      await page.locator(".recommendation h3").textContent(),
      story.headline,
    );
    assert.equal(
      await page
        .locator(".results")
        .getByText("MOCK DATA", { exact: true })
        .count(),
      0,
    );
    const fast = comparison.routes[0],
      rec = comparison.routes.find(
        (r) => r.id === comparison.recommendation?.routeId,
      )!;
    const overlap = measureCoverage(
      fast.geometry,
      [{ geometry: rec.geometry }],
      5,
    ).coverage;
    assert.ok(overlap < 90, "Actual geometries must clearly differ");
    await page
      .getByText("Why is this route recommended?", { exact: true })
      .click();
    await page
      .getByText("Fewer meaningful infrastructure gaps", { exact: true })
      .waitFor();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.mouse.move(0, 0);
    await page.locator(".leaflet-tile-loaded").first().waitFor();
    await page.screenshot({
      path: `docs/screenshots/cac/live-${name}.png`,
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    if (name === "desktop")
      await writeFile(
        "data/verification/cac-browser-comparison.json",
        JSON.stringify(comparison, null, 2) + "\n",
      );
    console.log(
      name,
      JSON.stringify({
        headline: story.headline,
        overlapWithin5m: overlap,
        start: comparison.start.label,
        destination: comparison.destination.label,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
