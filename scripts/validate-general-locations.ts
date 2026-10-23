import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { isWithinSupportedArea, lineWithinArea } from "../lib/geocoding/area";
import type { RouteComparison } from "../types/routes";
const dir = "data/general-validation";
await mkdir(dir, { recursive: true });
await mkdir("docs/screenshots/general", { recursive: true });
const browser = await chromium.launch(),
  summary = [];
try {
  const pairs = [
    { id: "showcase", start: null, end: null },
    {
      id: "library-park",
      start: "Bentonville Public Library",
      end: "Memorial Park",
    },
    {
      id: "crystal-plaza",
      start: "Crystal Bridges Museum of American Art",
      end: null,
    },
    { id: "street-addresses", start: "300 N MAIN ST", end: "500 S MAIN ST" },
  ];
  for (const [i, pair] of pairs.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 10000));
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const searches: unknown[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/api/locations?")) {
        try {
          searches.push({
            query: new URL(response.url()).searchParams.get("q"),
            ...(await response.json()),
          });
        } catch {
          /* Cancelled navigation response. */
        }
      }
    });
    await page.goto("http://localhost:3000/app");
    for (const [label, q] of [
      ["Starting point", pair.start],
      ["Destination", pair.end],
    ] as const)
      if (q) {
        await page.getByRole("combobox", { name: label, exact: true }).fill(q);
        const option = page
          .getByRole("listbox", { name: `${label} suggestions` })
          .getByRole("option")
          .first();
        await option.waitFor({ timeout: 30000 });
        await option.click();
      }
    const responsePromise = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/compare") && r.request().method() === "POST",
      { timeout: 65000 },
    );
    await page.getByRole("button", { name: "Compare routes" }).click();
    const response = await responsePromise,
      body = await response.json();
    assert.ok(response.ok(), JSON.stringify(body));
    const c = body.comparison as RouteComparison;
    assert.equal(c.source, "live");
    assert.ok(
      isWithinSupportedArea(...c.start.point) &&
        isWithinSupportedArea(...c.destination.point),
    );
    assert.ok(c.routes.every((r) => lineWithinArea(r.geometry)));
    await page.getByText("REAL DATA · V1", { exact: true }).waitFor();
    assert.equal(
      await page
        .locator(".results")
        .getByText("MOCK DATA", { exact: true })
        .count(),
      0,
    );
    await page
      .locator('.leaflet-overlay-pane path[stroke-width="7"]')
      .first()
      .waitFor();
    await page.locator(".leaflet-tile-loaded").first().waitFor();
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `docs/screenshots/general/${pair.id}-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `docs/screenshots/general/${pair.id}-mobile.png`,
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await writeFile(
      `${dir}/${pair.id}.json`,
      JSON.stringify({ searches, comparison: c }, null, 2) + "\n",
    );
    summary.push({
      id: pair.id,
      start: c.start,
      destination: c.destination,
      routes: c.routes.map((r) => ({ id: r.id, metrics: r.metrics })),
      recommendation: c.recommendation,
      realBadge: true,
    });
    console.log(
      pair.id,
      c.start.label,
      "→",
      c.destination.label,
      c.routes.map((r) => r.metrics.coverage.toFixed(2)),
    );
    await page.close();
  }
  const response = await fetch("http://localhost:3000/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: { label: "Outside Bentonville", point: [36.33, -94.1] },
      destination: {
        label: "Lawrence Plaza",
        point: [36.374649832783945, -94.20753355872435],
      },
    }),
  });
  assert.equal(response.status, 400);
  await writeFile(
    `${dir}/outside-rejection.json`,
    JSON.stringify(
      { status: response.status, body: await response.json() },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    `${dir}/summary.json`,
    JSON.stringify(
      { validatedAt: new Date().toISOString(), trips: summary },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
