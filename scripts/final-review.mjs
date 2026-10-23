/* global window, document */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
const observations = [];
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["laptop", { width: 1280, height: 900 }],
    ["tablet", { width: 834, height: 1112 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.locator(".leaflet-tile-loaded").first().waitFor();
    await page.waitForTimeout(700);
    await page.screenshot({
      path: `docs/screenshots/final-landing-${name}.png`,
      fullPage: true,
    });
    const landingFits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    await page.goto("http://localhost:3000/app");
    await page.getByRole("button", { name: "Compare routes" }).click();
    await page
      .getByText("REAL DATA · V1", { exact: true })
      .waitFor({ timeout: 60000 });
    await page.locator(".leaflet-tile-loaded").first().waitFor();
    await page.waitForTimeout(1200);
    const story = await page.locator(".recommendation h3").innerText();
    await page.screenshot({
      path: `docs/screenshots/final-app-${name}.png`,
      fullPage: true,
    });
    await page
      .getByText("Why is this route recommended?", { exact: true })
      .click();
    await page.screenshot({
      path: `docs/screenshots/final-recommendation-${name}.png`,
      fullPage: true,
    });
    const appFits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    await page.goto("http://localhost:3000/methodology");
    await page.screenshot({
      path: `docs/screenshots/final-methodology-${name}.png`,
      fullPage: true,
    });
    const technical = page.locator(".technical-details");
    const technicalCollapsed = !(await technical.getAttribute("open"));
    await technical.locator("summary").click();
    await page.getByText("Geometry matching", { exact: true }).waitFor();
    const methodFits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    observations.push({
      viewport: name,
      width: viewport.width,
      landingFits,
      appFits,
      methodFits,
      technicalCollapsed,
      story,
      browserErrors: errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "docs/screenshots/final-review.json",
  JSON.stringify(observations, null, 2) + "\n",
);
