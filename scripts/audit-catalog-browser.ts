import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { lineWithinArea } from "../lib/geocoding/area";
import { recommendationStory } from "../lib/presentation/recommendation";
import type { RouteComparison } from "../types/routes";
const base = process.argv[2] ?? "http://localhost:3000";
const dir = "docs/screenshots/location-catalog";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch(),
  rows: unknown[] = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
        viewport: { width, height: 1000 },
      }),
      page = await context.newPage(),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const layout = async () =>
      page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        h1: document.querySelectorAll("h1").length,
      }));
    for (const path of ["/", "/methodology"]) {
      const response = await page.goto(base + path);
      assert.equal(response?.status(), 200);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const dimensions = await layout();
      assert.equal(dimensions.overflow, false);
      assert.equal(dimensions.h1, 1);
      assert.equal(axe.violations.length, 0);
      if (path === "/") {
        assert.match(
          await page.locator("body").innerText(),
          /mock|illustrative/i,
        );
        await page.screenshot({
          path: `${dir}/landing-${width}.png`,
          fullPage: true,
        });
      }
      rows.push({
        width,
        path,
        ...dimensions,
        axeViolations: axe.violations.length,
      });
    }
    await page.goto(base + "/app");
    const start = page.getByRole("combobox", {
        name: "Starting point",
        exact: true,
      }),
      destination = page.getByRole("combobox", {
        name: "Destination",
        exact: true,
      }),
      button = page.getByRole("button", {
        name: "Compare routes",
        exact: true,
      });
    assert.equal(await start.inputValue(), "Austin-Baggett Park");
    assert.equal(await destination.inputValue(), "Lawrence Plaza");
    const compare = async (label: string) => {
      const pending = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/compare") && r.request().method() === "POST",
        { timeout: 70000 },
      );
      await button.click();
      const response = await pending,
        body = await response.json(),
        comparison = body.comparison as RouteComparison;
      assert.equal(response.status(), 200, JSON.stringify(body));
      assert.equal(comparison.source, "live");
      await page.getByText("REAL DATA · V1", { exact: true }).waitFor();
      assert.ok(comparison.routes.every((r) => lineWithinArea(r.geometry)));
      assert.equal(
        new Set(comparison.routes.map((r) => JSON.stringify(r.geometry))).size,
        comparison.routes.length,
      );
      assert.ok(
        !(await page.locator(".results").innerText()).includes("MOCK DATA"),
      );
      assert.equal(
        await page.locator(".recommendation h3").innerText(),
        recommendationStory(comparison).headline,
      );
      for (const r of comparison.routes.slice(0, 2))
        assert.ok(
          (await page.locator(`.route-card.${r.id}`).innerText()).includes(
            r.metrics.coverage.toFixed(2) + "%",
          ),
        );
      await page
        .locator(".leaflet-tile-loaded")
        .first()
        .waitFor({ timeout: 30000 });
      const dimensions = await layout();
      assert.equal(dimensions.overflow, false);
      await page.screenshot({
        path: `${dir}/${label}-${width}.png`,
        fullPage: true,
      });
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.equal(axe.violations.length, 0);
      rows.push({
        width,
        label,
        status: response.status(),
        start: comparison.start,
        destination: comparison.destination,
        routes: comparison.routes.map((r) => ({
          id: r.id,
          metrics: r.metrics,
          recommended: r.recommended,
          vertices: r.geometry.length,
        })),
        story: recommendationStory(comparison),
        provenance: comparison.provenance,
        ...dimensions,
        axeViolations: axe.violations.length,
      });
    };
    await compare("showcase");
    await start.fill("Creekside MS");
    assert.ok(await button.isDisabled());
    const school = page.getByRole("option", {
      name: /Creekside Middle School/,
    });
    await school.waitFor({ timeout: 20000 });
    await page.screenshot({
      path: `${dir}/school-search-${width}.png`,
      fullPage: true,
    });
    await start.press("ArrowDown");
    await start.press("Enter");
    assert.equal(await start.inputValue(), "Creekside Middle School");
    await destination.fill("community center");
    assert.ok(await button.isDisabled());
    await page
      .getByRole("option", { name: /Bentonville Community Center/ })
      .first()
      .click();
    await compare("school-live");
    await start.fill("Osage Creek Elementary");
    assert.ok(await button.isDisabled());
    assert.equal(await page.locator(".route-card").count(), 0);
    await page
      .getByRole("option", { name: /Osage Creek Elementary/ })
      .first()
      .waitFor({ timeout: 20000 });
    await page
      .getByRole("button", { name: "Clear starting point", exact: true })
      .click();
    assert.equal(await start.inputValue(), "");
    assert.ok(await button.isDisabled());
    await start.fill("XNA");
    await page
      .getByText(/No matching supported locations/)
      .waitFor({ timeout: 20000 });
    assert.ok(await button.isDisabled());
    assert.deepEqual(errors, []);
    rows.push({
      width,
      selectionSafety:
        "explicit keyboard/touch selection, editing/clear invalidation, XNA rejected",
      pageErrors: errors,
    });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(
    "data/location-catalog/browser-verification.json",
    JSON.stringify({ checkedAt: new Date().toISOString(), rows }, null, 2) +
      "\n",
  );
}
console.log("Real catalog/browser walkthrough passed at 1440px and 390px.");
