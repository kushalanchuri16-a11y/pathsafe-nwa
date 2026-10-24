// Presentation QA only. All app comparisons use the saved, unmodified live fixture.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const base = process.argv[2] ?? "http://localhost:3000";
const dir = "docs/screenshots/frontend-polish";
await mkdir(dir, { recursive: true });
const fixture = JSON.parse(
  await readFile("data/verification/cac-live-comparison.json", "utf8"),
);
const browser = await chromium.launch();
const results: unknown[] = [];
const sizes = [1440, 1280, 1024, 834, 768, 430, 390, 375];
try {
  for (const width of sizes) {
    const context = await browser.newContext({
        viewport: { width, height: width <= 430 ? 900 : 1000 },
      }),
      page = await context.newPage(),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript({
      content: `(() => {
      let cls = 0;
      Object.defineProperty(window, "__polishCLS", { get() { return cls; } });
      if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      }
    })();`,
    });
    const layout = async () =>
      page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        h1: document.querySelectorAll("h1").length,
      }));
    await page.route("**/api/compare", (r) =>
      r.fulfill({ json: { comparison: fixture } }),
    );
    await page.goto(base + "/");
    await page.locator(".preview-results strong").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(550);
    const landingCLS = await page.evaluate(() =>
      Number(Reflect.get(window, "__polishCLS") ?? 0),
    );
    assert.ok(
      landingCLS <= 0.1,
      `Unexpected landing layout shift: ${landingCLS}`,
    );
    assert.ok(
      await page
        .locator(".hero-route-flow")
        .evaluate(
          (el) => getComputedStyle(el).animationIterationCount !== "infinite",
        ),
    );

    for (const section of await page.locator("[data-reveal]").all()) {
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(140);
    }
    await page.waitForTimeout(800);
    assert.equal(await page.locator("[data-motion-pending]").count(), 0);
    const landing = await layout();
    assert.equal(landing.overflow, false);
    assert.equal(landing.h1, 1);
    assert.ok(
      (await page.locator(".showcase-section").innerText()).includes(
        "ILLUSTRATIVE SHOWCASE",
      ),
    );
    assert.ok(
      (await page.locator(".showcase-section").innerText()).includes("74.6"),
    );
    const landingAxe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      landingAxe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    if ([1440, 390, 375].includes(width))
      await page.screenshot({
        path: `${dir}/landing-${width}.png`,
        fullPage: true,
      });
    await page.screenshot({ path: `${dir}/hero-${width}.png` });
    await page.goto(base + "/app");
    await page
      .locator(".leaflet-tile-loaded")
      .first()
      .waitFor({ timeout: 20000 });
    if ([1440, 390].includes(width))
      await page.screenshot({
        path: `${dir}/app-initial-${width}.png`,
        fullPage: true,
      });
    await page
      .getByRole("button", { name: "Compare routes", exact: true })
      .click();
    await page.getByText("REAL DATA · V1", { exact: true }).waitFor();
    await page.waitForTimeout(1100);
    assert.ok((await page.locator(".results").innerText()).includes("74.64%"));
    assert.ok((await page.locator(".results").innerText()).includes("96.39%"));
    const app = await layout();
    assert.equal(app.overflow, false);
    assert.equal(app.h1, 1);
    const appAxe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      appAxe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `${dir}/app-results-${width}.png`,
      fullPage: true,
    });
    if ([1440, 390].includes(width)) {
      await page.reload();
      await page.unroute("**/api/compare");
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/api/compare", async (r) => {
        await gate;
        await r.fulfill({
          status: 503,
          json: { error: "Live route analysis is temporarily unavailable." },
        });
      });
      await page
        .getByRole("button", { name: "Compare routes", exact: true })
        .click();
      await page
        .getByText("Preparing your route comparison…", { exact: true })
        .waitFor();
      assert.equal((await layout()).overflow, false);
      await page.locator(".loading-state").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${dir}/app-loading-${width}.png`,
        fullPage: true,
      });
      release();
      await page.locator(".empty-state:not(.initial-state)").waitFor();
      assert.equal((await layout()).overflow, false);
      const resetBounds = await page
        .getByRole("button", { name: "Reset demo", exact: true })
        .boundingBox();
      const fallbackBounds = await page
        .getByRole("button", { name: "View demo data", exact: true })
        .boundingBox();
      assert.ok(resetBounds && fallbackBounds);
      assert.ok(
        fallbackBounds.y >= resetBounds.y + resetBounds.height,
        "Error recovery actions must not overlap",
      );
      await page.screenshot({
        path: `${dir}/app-error-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Reset demo", exact: true })
        .click();
      assert.ok(
        await page
          .getByRole("button", { name: "Compare routes", exact: true })
          .isEnabled(),
      );
    }
    assert.deepEqual(errors, []);
    results.push({
      width,
      landingCLS,
      landing,
      app,
      axeViolations: landingAxe.violations.length + appAxe.violations.length,
      pageErrors: errors,
    });
    console.log("Passed visual layout/contrast/flow:", width);
    await context.close();
  }
  // Reduced motion: all presentation content stays visible; no animations or hidden reveals.
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      }),
      page = await context.newPage();
    await page.goto(base + "/");
    await page.waitForTimeout(250);
    assert.equal(await page.locator("[data-motion-pending]").count(), 0);
    assert.ok(
      await page
        .locator(".hero-route-trace")
        .evaluate((el) => getComputedStyle(el).animationName === "none"),
    );
    for (const section of await page.locator("[data-reveal]").all())
      assert.equal(
        await section.evaluate((el) => getComputedStyle(el).opacity),
        "1",
      );
    await page.screenshot({
      path: `${dir}/reduced-motion-${width}.png`,
      fullPage: true,
    });
    await page.route("**/api/compare", (r) =>
      r.fulfill({ json: { comparison: fixture } }),
    );
    await page.goto(base + "/app");
    await page
      .getByRole("button", { name: "Compare routes", exact: true })
      .click();
    await page.getByText("REAL DATA · V1", { exact: true }).waitFor();
    assert.ok(
      await page
        .locator(".route-card .route-coverage-track span")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName === "none"),
    );
    assert.equal(
      await page
        .locator(".route-card .route-coverage-track span")
        .first()
        .evaluate((el) => getComputedStyle(el).transform),
      "none",
    );
    results.push({
      width,
      reducedMotion: true,
      contentVisible: true,
      animationsDisabled: true,
    });
    await context.close();
  }
  // With no JS, server-rendered landing content and showcase remain usable.
  const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 900 },
    }),
    page = await context.newPage();
  await page.goto(base + "/");
  assert.equal(await page.locator("[data-motion-pending]").count(), 0);
  assert.ok(
    await page
      .getByRole("heading", { name: "A few seconds. A lot more context." })
      .isVisible(),
  );
  results.push({ noJavaScript: true, showcaseVisible: true });
  await context.close();
} finally {
  await browser.close();
  await writeFile(
    `${dir}/verification.json`,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        note: "Saved real-response fixture used for visual states; no live backend analysis claimed.",
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
console.log("Frontend visual QA passed.");
