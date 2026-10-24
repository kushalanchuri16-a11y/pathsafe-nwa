import { chromium, webkit, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lineWithinArea } from "../lib/geocoding/area";
import { coordinateDistance } from "../lib/analysis/geometry";
import type { RouteComparison } from "../types/routes";
const base = "http://127.0.0.1:3000",
  dir = "data/website-audit",
  screenshots = "docs/screenshots/website-audit";
await mkdir(dir, { recursive: true });
await mkdir(screenshots, { recursive: true });
const mode = process.argv[2] ?? "layout";
const browser = await chromium.launch();
const findings: unknown[] = [];
function observe(page: Page) {
  const errors: string[] = [],
    failed: string[] = [],
    consoleErrors: string[] = [];
  const counts: Record<string, number> = {};
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("requestfailed", (r) => {
    if (!r.failure()?.errorText.includes("ABORTED"))
      failed.push(r.url() + " " + r.failure()?.errorText);
  });
  page.on("request", (r) => {
    if (r.url().includes("/api/")) {
      const key = new URL(r.url()).pathname;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  });
  return { errors, failed, consoleErrors, counts };
}
async function layout(page: Page) {
  return page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > innerWidth,
    h1: document.querySelectorAll("h1").length,
    main: document.querySelectorAll("main").length,
    brokenImages: [...document.images]
      .filter((i) => i.complete && !i.naturalWidth)
      .map((i) => i.src),
    clippedControls: [...document.querySelectorAll("button,input,select")]
      .filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && (b.left < -1 || b.right > innerWidth + 1);
      })
      .map((e) => e.getAttribute("aria-label") || e.textContent),
    title: document.title,
    icon: document.querySelector('link[rel="icon"]')?.getAttribute("href"),
    invalidNumbers: /\b(NaN|Infinity|undefined|null)\b/.test(
      document.body.innerText,
    ),
  }));
}
async function choose(page: Page, label: string, query: string) {
  const input = page.getByRole("combobox", { name: label, exact: true });
  await input.fill("");
  await input.fill(query);
  await assert.doesNotReject(() =>
    page
      .getByRole("button", { name: "Compare routes", exact: true })
      .isDisabled()
      .then((v) => assert.ok(v)),
  );
  const option = page
    .getByRole("listbox", { name: label + " suggestions" })
    .getByRole("option")
    .first();
  await option.waitFor({ timeout: 30000 });
  const displayed = await option.innerText();
  await option.click();
  return displayed;
}
async function compare(page: Page) {
  const pending = page.waitForResponse(
    (r) => r.url().endsWith("/api/compare") && r.request().method() === "POST",
    { timeout: 70000 },
  );
  await page
    .getByRole("button", { name: "Compare routes", exact: true })
    .click();
  const response = await pending,
    body = await response.json();
  return { status: response.status(), body };
}
try {
  if (mode === "layout") {
    for (const width of [1440, 1280, 1024, 834, 768, 430, 390, 375]) {
      const context = await browser.newContext({
          viewport: { width, height: 1000 },
        }),
        page = await context.newPage(),
        events = observe(page);
      for (const path of ["/", "/app", "/methodology"]) {
        const r = await page.goto(base + path);
        await page.locator("h1").waitFor();
        if (path !== "/methodology")
          await page
            .locator(".leaflet-tile-loaded")
            .first()
            .waitFor({ timeout: 20000 });
        if (path === "/app") {
          await page
            .getByRole("combobox", { name: "Starting point" })
            .fill("bentonville community");
          await page
            .getByRole("listbox", { name: "Starting point suggestions" })
            .getByRole("option")
            .first()
            .waitFor({ timeout: 30000 });
        }
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        const metrics = await layout(page);
        await page.screenshot({
          path: `${screenshots}/${path === "/" ? "landing" : path.slice(1)}-${width}.png`,
          fullPage: true,
        });
        findings.push({
          path,
          status: r?.status(),
          ...metrics,
          axe: scan.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
          ...events,
        });
      }
      await context.close();
      console.log("layout", width);
    }
    const context404 = await browser.newContext();
    const page = await context404.newPage();
    const response = await page.goto(base + "/missing-audit-page");
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    findings.push({
      path: "/missing-audit-page",
      status: response?.status(),
      ...(await layout(page)),
      axe: scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    });
    await page.close();
  }
  if (mode === "live") {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      events = observe(page);
    await page.goto(base + "/app");
    const pairs = [
      ["showcase", "Austin-Baggett Park", "Lawrence Plaza"],
      ["endpoint-edit", "Bentonville Public Library", "Lawrence Plaza"],
      ["mistletoe", "3809 SW Mistletoe Ave", "Crystal Bridges"],
      ["library-park", "Bentonville Public Library", "Memorial Park"],
      [
        "airport-library",
        "Bentonville Municipal Airport",
        "Bentonville Public Library",
      ],
      ["main-street", "300 N Main St", "500 S Main St"],
      ["short", "1509 SW A ST", "1601 SW A ST"],
      ["cross-city", "Bentonville Community Center", "Crystal Bridges"],
      ["edge", "4208 E CENTRAL AVE", "Lawrence Plaza"],
    ];
    for (const [id, start, end] of pairs) {
      if (id !== "showcase") {
        await page
          .getByRole("button", { name: "Clear starting point" })
          .click();
        if (id !== "endpoint-edit")
          await page.getByRole("button", { name: "Clear destination" }).click();
        assert.equal(await page.locator(".route-card").count(), 0);
      }
      await choose(page, "Starting point", start);
      assert.equal(await page.locator(".route-card").count(), 0);
      if (id !== "endpoint-edit") await choose(page, "Destination", end);
      const result = await compare(page),
        c = result.body.comparison as RouteComparison | undefined;
      if (!c) {
        await page
          .getByRole("heading", {
            name: "No supported walking route",
            exact: true,
          })
          .waitFor();
        assert.equal(await page.locator(".route-card").count(), 0);
        findings.push({ id, start, end, ...result });
        continue;
      }
      await page.getByText("REAL DATA · V1", { exact: true }).waitFor();
      assert.equal(c.source, "live");
      assert.ok(c.routes.every((r) => lineWithinArea(r.geometry)));
      assert.equal(
        new Set(c.routes.map((r) => JSON.stringify(r.geometry))).size,
        c.routes.length,
      );
      assert.equal(
        await page
          .locator(".results")
          .getByText("MOCK DATA", { exact: true })
          .count(),
        0,
      );
      if (await page.locator(".additional-routes summary").count())
        await page.locator(".additional-routes summary").click();
      const cards = [];
      for (const r of c.routes) {
        const card = page.locator(`.route-card.${r.id}`),
          text = await card.innerText();
        assert.ok(text.includes(r.metrics.coverage.toFixed(2) + "%"));
        assert.ok(text.includes(r.metrics.minutes.toFixed(2)));
        assert.ok(text.includes(r.metrics.miles.toFixed(2)));
        assert.equal(
          await card.locator(".recommended").count(),
          r.recommended ? 1 : 0,
        );
        await card.click();
        assert.equal(await card.getAttribute("aria-pressed"), "true");
        const stroke = await page
          .locator('.leaflet-overlay-pane path[stroke-width="7"]')
          .getAttribute("stroke");
        assert.equal(
          stroke,
          r.id === "fastest"
            ? "#64748b"
            : r.id === "pathsafe"
              ? "#19664f"
              : "#1c707e",
        );
        cards.push(text);
      }
      await page.locator(`.route-card.${c.recommendation!.routeId}`).click();
      const mapLayouts = [];
      for (const width of [1440, 1280, 1024, 834, 768, 430, 390, 375]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.waitForTimeout(250);
        await page.locator(".map-reset").click();
        await page.waitForTimeout(300);
        const labels = await page
          .locator(".leaflet-tooltip")
          .evaluateAll((elements) =>
            elements
              .filter((e) => /^(Start|Destination) ·/.test(e.textContent ?? ""))
              .map((e) => {
                const b = e.getBoundingClientRect(),
                  m = e.closest(".leaflet-container")!.getBoundingClientRect(),
                  legend = e
                    .closest(".leaflet-container")!
                    .parentElement!.querySelector(".map-legend")!
                    .getBoundingClientRect();
                return {
                  text: e.textContent,
                  legendOverlap:
                    Math.min(b.right, legend.right) >
                      Math.max(b.left, legend.left) &&
                    Math.min(b.bottom, legend.bottom) >
                      Math.max(b.top, legend.top),
                  clipped:
                    b.left < m.left - 1 ||
                    b.right > m.right + 1 ||
                    b.top < m.top - 1 ||
                    b.bottom > m.bottom + 1,
                };
              }),
          );
        assert.ok(
          labels.every((label) => !label.clipped && !label.legendOverlap),
          `${id} ${width}: endpoint label obstructed`,
        );
        mapLayouts.push({ ...(await layout(page)), labels });
        if (id === "showcase" || id === "mistletoe" || id === "airport-library")
          await page.screenshot({
            path: `${screenshots}/${id}-${width}.png`,
            fullPage: true,
          });
      }
      findings.push({
        id,
        status: result.status,
        start: c.start,
        destination: c.destination,
        recommendation: c.recommendation,
        provenance: c.provenance,
        routes: c.routes.map((r) => ({
          id: r.id,
          recommended: r.recommended,
          metrics: r.metrics,
          vertices: r.geometry.length,
          geometryHash: createHash("sha256")
            .update(JSON.stringify(r.geometry))
            .digest("hex"),
          startSnapMeters: coordinateDistance(c.start.point, r.geometry[0]),
          endSnapMeters: coordinateDistance(
            c.destination.point,
            r.geometry.at(-1)!,
          ),
        })),
        cards,
        mapLayouts,
      });
      console.log(
        "live",
        id,
        c.routes.map((r) => r.metrics.coverage.toFixed(2)),
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    // Use a typo and an outside query after several successful comparisons.
    await choose(page, "Starting point", "crstal bridges");
    await page
      .getByRole("combobox", { name: "Destination", exact: true })
      .fill("XNA");
    await page
      .getByText(/No matching supported locations/)
      .waitFor({ timeout: 30000 });
    assert.ok(
      await page
        .getByRole("button", { name: "Compare routes", exact: true })
        .isDisabled(),
    );
    assert.equal(await page.locator(".route-card").count(), 0);
    findings.push({ id: "fuzzy-and-XNA", events, layout: await layout(page) });
    await page.close();
  }
  if (mode === "expanded") {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage(),
      events = observe(page);
    for (const path of ["/methodology", "/app"]) {
      await page.goto(base + path);
      if (path === "/methodology")
        await page.locator(".technical-details summary").click();
      else {
        await compare(page);
        await page.getByText("REAL DATA · V1", { exact: true }).waitFor();
        for (const text of [
          "Why is this route recommended?",
          "What goes into the score?",
          "Data sources & limitations",
        ])
          await page.getByText(text, { exact: true }).click();
      }
      for (const width of [1440, 1280, 1024, 834, 768, 430, 390, 375]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.waitForTimeout(250);
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        findings.push({
          path,
          expanded: true,
          ...(await layout(page)),
          axe: scan.violations.map((v) => v.id),
          events,
        });
        if (width === 375 || width === 1440)
          await page.screenshot({
            path: `${screenshots}/expanded-${path.slice(1)}-${width}.png`,
            fullPage: true,
          });
      }
    }
    await context.close();
  }
  if (mode === "navigation") {
    const page = await browser.newPage(),
      events = observe(page),
      links = new Set<string>();
    for (const path of ["/", "/app", "/methodology"]) {
      await page.goto(base + path);
      for (const href of await page
        .locator("a[href]")
        .evaluateAll((es) => es.map((e) => e.getAttribute("href")!)))
        if (href.startsWith("/") || href.startsWith("#")) links.add(href);
    }
    for (const href of links) {
      await page.goto(base + "/");
      const r = await page.goto(base + href);
      const hash = new URL(page.url()).hash;
      findings.push({
        href,
        status: r?.status(),
        anchorExists: !hash || (await page.locator(hash).count()) > 0,
      });
    }
    await page.goto(base + "/");
    await page
      .getByRole("link", { name: /Try PathSafe/ })
      .first()
      .click();
    await page.waitForURL("**/app");
    await page.getByRole("link", { name: "METHODOLOGY", exact: true }).click();
    await page.waitForURL("**/methodology");
    await page.goBack();
    await page.waitForURL("**/app");
    assert.ok(page.url().endsWith("/app"));
    await page.goForward();
    await page.waitForURL("**/methodology");
    assert.ok(page.url().endsWith("/methodology"));
    await page.goto(base + "/app");
    await page.reload();
    await page.locator(".leaflet-tile-loaded").first().waitFor();
    await page
      .getByRole("button", { name: "Compare routes", exact: true })
      .waitFor();
    const title = await page.title();
    const icon = await page.request.get(base + "/icon.svg");
    const og = await page.request.get(base + "/opengraph-image");
    findings.push({
      id: "history-refresh-metadata",
      title,
      icon: icon.status(),
      openGraph: og.status(),
      events,
    });
    await page.close();
    for (const name of ["chrome", "webkit"]) {
      try {
        const b =
          name === "chrome"
            ? await chromium.launch({ channel: "chrome" })
            : await webkit.launch();
        const p = await b.newPage(),
          ev = observe(p);
        await p.goto(base + "/");
        await p.locator(".leaflet-tile-loaded").first().waitFor();
        await p.goto(base + "/app");
        const response = await compare(p);
        await p.getByText("REAL DATA · V1", { exact: true }).waitFor();
        findings.push({
          browser: name,
          status: response.status,
          ...(await layout(p)),
          events: ev,
        });
        await b.close();
      } catch (e) {
        findings.push({
          browser: name,
          unavailable: String(e).includes("Executable doesn't exist")
            ? "Browser binary is not installed in this environment."
            : String(e),
        });
      }
    }
  }
} finally {
  await browser.close();
  await writeFile(
    `${dir}/${mode}.json`,
    JSON.stringify(
      { checkedAt: new Date().toISOString(), mode, findings },
      null,
      2,
    ) + "\n",
  );
}
