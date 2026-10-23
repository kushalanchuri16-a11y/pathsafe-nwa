import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto("http://localhost:3000/app");
  const responsePromise = page.waitForResponse((r) =>
    r.url().includes("/api/locations?"),
  );
  await page
    .getByRole("combobox", { name: "Starting point" })
    .fill("Bentonville Community Center");
  const response = await responsePromise;
  await writeFile(
    "data/general-validation/community-center-search.json",
    JSON.stringify(await response.json(), null, 2) + "\n",
  );
  await page
    .getByRole("listbox", { name: "Starting point suggestions" })
    .waitFor();
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "docs/screenshots/general/search-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("combobox", { name: "Starting point" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "docs/screenshots/general/search-mobile.png",
    fullPage: true,
  });
} finally {
  await browser.close();
}
