import { test, expect } from "@playwright/test";
const library = {
  id: "city-place:68",
  label: "Library",
  point: [36.36770870312484, -94.20851110772566],
  address: "405 S MAIN ST",
  kind: "place",
  attribution: "City of Bentonville GIS",
};
test("autocomplete debounces, requires explicit choice, supports keyboard/clear and mobile touch", async ({
  page,
}) => {
  let searches = 0,
    comparisons = 0;
  await page.route("**/api/locations?**", async (route) => {
    searches++;
    await route.fulfill({
      json: {
        results: [library, { ...library, id: "annex", label: "Library annex" }],
      },
    });
  });
  await page.route("**/api/compare", async (route) => {
    comparisons++;
    const body = route.request().postDataJSON();
    expect(body.start.label).toBe("Library");
    expect(body.start.point).toEqual(library.point);
    await route.fulfill({
      status: 503,
      json: { error: "Live route analysis is temporarily unavailable." },
    });
  });
  await page.goto("/app");
  const start = page.getByRole("combobox", { name: "Starting point" });
  await start.fill("Lib");
  await start.fill("Libr");
  await start.fill("Library");
  await expect(
    page.getByRole("listbox", { name: "Starting point suggestions" }),
  ).toBeVisible();
  expect(searches).toBe(1);
  expect(comparisons).toBe(0);
  await expect(start).toHaveAttribute("aria-expanded", "true");
  await start.press("ArrowDown");
  await start.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: /Library annex/ }),
  ).toHaveAttribute("aria-selected", "true");
  await start.press("ArrowUp");
  await start.press("Enter");
  await expect(
    page.getByText("Selected: Library", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Compare routes" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Live route analysis is temporarily unavailable.",
      exact: true,
    }),
  ).toBeVisible();
  expect(comparisons).toBe(1);
  await page.getByRole("button", { name: "Clear starting point" }).click();
  await expect(start).toHaveValue("");
  await start.fill("Library");
  await page
    .getByRole("option", {
      name: "Library 405 S MAIN ST · Bentonville",
      exact: true,
    })
    .click();
  await expect(start).toHaveValue("Library");
  expect(searches).toBe(1); // component cache, no repeated HTTP request
  await page.unroute("**/api/locations?**");
  await page.route("**/api/locations?**", async (route) => {
    await new Promise((r) => setTimeout(r, 1000));
    await route.fulfill({ json: { results: [library] } }).catch(() => {});
  });
  await start.fill("Uncached query");
  await page.getByLabel("Searching locations", { exact: true }).waitFor();
  await page.getByLabel("Analysis source").selectOption("mock");
  await expect(start).toHaveValue("Austin-Baggett Park");
  await expect(
    page.getByText("Selected: Austin-Baggett Park", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Searching locations", { exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("search empty/failure and unresolved text are explicit and never submit a route", async ({
  page,
}) => {
  let comparisons = 0;
  await page.route("**/api/compare", (r) => {
    comparisons++;
    return r.abort();
  });
  await page.route("**/api/locations?**", (r) =>
    r.fulfill({ json: { results: [] } }),
  );
  await page.goto("/app");
  const start = page.getByRole("combobox", { name: "Starting point" });
  await start.fill("Outside Place");
  await expect(page.getByText(/No matching supported locations/)).toBeVisible();
  await page.getByRole("button", { name: "Compare routes" }).click();
  await expect(
    page.getByText("Choose both locations from the search suggestions.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(comparisons).toBe(0);
  await page.unroute("**/api/locations?**");
  await page.route("**/api/locations?**", (r) =>
    r.fulfill({
      status: 503,
      json: {
        error: "Location search is temporarily unavailable. Please try again.",
      },
    }),
  );
  await start.fill("Another query");
  await expect(
    page.getByText(
      "Location search is temporarily unavailable. Please try again.",
      { exact: true },
    ),
  ).toBeVisible();
});
