import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { coordinateDistance } from "../lib/analysis/geometry";
await mkdir("docs/screenshots/reliability", { recursive: true });
const browser = await chromium.launch(),
  results = [];
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["laptop", 1280, 900],
    ["tablet", 834, 1112],
    ["mobile", 390, 844],
  ] as const) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage(),
      consoleErrors: string[] = [],
      pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    await page.goto("http://127.0.0.1:3000/app");
    for (const [label, query] of [
      ["Starting point", "3809 SW MISTLETOE AVE"],
      ["Destination", "Crystal Bridges"],
    ]) {
      const input = page.getByRole("combobox", { name: label, exact: true });
      await input.fill(query);
      const options = page.getByRole("listbox", {
        name: `${label} suggestions`,
      });
      await options.waitFor();
      if (name === "mobile") await options.getByRole("option").first().click();
      else {
        await input.press("ArrowDown");
        await input.press("Enter");
      }
    }
    const responsePromise = page.waitForResponse((r) =>
      r.url().endsWith("/api/compare"),
    );
    await page.getByRole("button", { name: "Compare routes" }).click();
    const response = await responsePromise,
      body = await response.json();
    assert.equal(response.status(), 200, JSON.stringify(body));
    const c = body.comparison;
    await page.getByText("REAL DATA · V1", { exact: true }).waitFor();
    assert.equal(c.routes.length, 2);
    assert.equal(
      await page
        .locator(".results")
        .getByText("MOCK DATA", { exact: true })
        .count(),
      0,
    );
    assert.ok(
      c.routes.every(
        (r: { geometry: [number, number][] }) =>
          coordinateDistance(c.start.point, r.geometry[0]) <= 100 &&
          coordinateDistance(c.destination.point, r.geometry.at(-1)!) <= 100,
      ),
    );
    await page
      .locator('.leaflet-overlay-pane path[stroke-width="7"]')
      .first()
      .waitFor();
    await page.locator(".leaflet-tile-loaded").first().waitFor();
    await page.mouse.move(0, 0);
    await page.getByText("Data sources & limitations", { exact: true }).click();
    await page.getByText(/1 provider alternative\(s\) excluded/).waitFor();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `docs/screenshots/reliability/mistletoe-${name}.png`,
      fullPage: true,
    });
    const clips = await page
      .locator(".leaflet-tooltip")
      .evaluateAll((elements) =>
        elements
          .filter(
            (e) =>
              e.textContent?.includes("Start ·") ||
              e.textContent?.includes("Destination ·"),
          )
          .map((e) => {
            const box = e.getBoundingClientRect(),
              map = e.closest(".leaflet-container")!.getBoundingClientRect();
            return {
              text: e.textContent,
              clipped:
                box.left < map.left ||
                box.right > map.right ||
                box.top < map.top ||
                box.bottom > map.bottom,
            };
          }),
      );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
    assert.ok(
      clips.every((c) => !c.clipped),
      JSON.stringify(clips),
    );
    results.push({
      name,
      width,
      height,
      source: c.source,
      candidates: c.routes.length,
      consoleErrors,
      pageErrors,
      clips,
      metrics: c.routes.map((r: { id: string; metrics: unknown }) => ({
        id: r.id,
        metrics: r.metrics,
      })),
    });
    console.log(name, "passed", clips);
    await context.close();
  }
  await writeFile(
    "data/reliability/browser-audit.json",
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
}
