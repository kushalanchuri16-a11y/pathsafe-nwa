import { test, expect } from "@playwright/test";
test("gateway errors remain usable and missing pages have a working return path", async ({
  page,
}) => {
  let searches = 0;
  await page.route("**/api/compare", (r) =>
    r.fulfill({
      status: 502,
      contentType: "text/html",
      body: "<html>Bad gateway</html>",
    }),
  );
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Compare routes", exact: true })
    .click();
  await expect(
    page.getByText(/server returned an unreadable response/),
  ).toBeVisible();
  await expect(page.locator(".route-card")).toHaveCount(0);
  await page.route("**/api/locations?**", (r) => {
    searches++;
    return r.fulfill(
      searches === 1
        ? {
            status: 502,
            contentType: "text/html",
            body: "<html>Bad gateway</html>",
          }
        : { json: {} },
    );
  });
  const input = page.getByRole("combobox", {
    name: "Starting point",
    exact: true,
  });
  for (const text of ["library", "library again"]) {
    await input.fill(text);
    await expect(
      page.getByText(
        "Location search is temporarily unavailable. Please try again.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Compare routes", exact: true }),
    ).toBeDisabled();
  }
  await page.getByLabel("Analysis source").selectOption("mock");
  await page.getByLabel("Analysis source").selectOption("live");
  await expect(
    page.getByRole("button", { name: "Compare routes", exact: true }),
  ).toBeEnabled();
  const response = await page.goto("/missing-audit-page");
  expect(response?.status()).toBe(404);
  await expect(page.locator("main#main")).toHaveCount(1);
  await page.getByRole("link", { name: "Return home", exact: true }).click();
  await expect(page).toHaveURL("/");
});

test("long endpoint labels stay above the map legend after automatic resize", async ({
  page,
}) => {
  const { readFileSync } = await import("node:fs");
  const comparison = JSON.parse(
    readFileSync("tests/fixtures/airport-map-comparison.json", "utf8"),
  );
  await page.route("**/api/compare", (r) =>
    r.fulfill({ json: { comparison } }),
  );
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Compare routes", exact: true })
    .click();
  await page.getByText("REAL DATA · V1", { exact: true }).waitFor();
  await expect(
    page.getByText("Start · " + comparison.start.label, { exact: true }),
  ).toBeVisible();
  for (const width of [1440, 834, 375, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() =>
        page.locator(".leaflet-container").evaluate((container) => {
          const map = container.getBoundingClientRect(),
            legend = container
              .parentElement!.querySelector(".map-legend")!
              .getBoundingClientRect();
          const labels = [
            ...container.querySelectorAll(".leaflet-tooltip"),
          ].filter((e) => /^(Start|Destination) ·/.test(e.textContent ?? ""));
          return (
            labels.length !== 2 ||
            labels.some((e) => {
              const r = e.getBoundingClientRect();
              return (
                r.left < map.left - 1 ||
                r.right > map.right + 1 ||
                r.top < map.top - 1 ||
                r.bottom > map.bottom + 1 ||
                (Math.min(r.right, legend.right) >
                  Math.max(r.left, legend.left) &&
                  Math.min(r.bottom, legend.bottom) >
                    Math.max(r.top, legend.top))
              );
            })
          );
        }),
      )
      .toBe(false);
  }
});
