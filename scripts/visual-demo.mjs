/* global window, document, console */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:3000/app", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Compare routes" }).click();
    await page
      .getByText("REAL DATA · V1", { exact: true })
      .waitFor({ timeout: 60000 });
    await page.locator(".leaflet-tile-loaded").first().waitFor();
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      document
        .querySelector(".control-panel")
        .scrollTo({ top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: `docs/screenshots/phase2-${name}.png`,
      fullPage: true,
    });
    await page.getByText("Data sources & limitations", { exact: true }).click();
    console.log(name, await page.locator(".methodology").last().innerText());
    console.log("browserErrors", errors);
    await page.close();
  }
} finally {
  await browser.close();
}
