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
  await start.fill("Library edited");
  await expect(
    page.getByRole("button", { name: "Compare routes" }),
  ).toBeDisabled();
  await start.press("Tab");
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
  await expect(
    page.getByRole("button", { name: "Compare routes" }),
  ).toBeDisabled();
  await start.press("Enter");
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

test("late responses cannot replace newer input; Escape/Tab never select, pointer choice confirms", async ({
  page,
  isMobile,
}) => {
  let comparisons = 0;
  await page.route("**/api/compare", (r) => {
    comparisons++;
    return r.abort();
  });
  await page.route("**/api/locations?**", async (r) => {
    const old =
      new URL(r.request().url()).searchParams.get("q") === "Old library";
    if (old) await new Promise((resolve) => setTimeout(resolve, 1000));
    await r
      .fulfill({
        json: {
          results: [{ ...library, label: old ? "Old library" : "Library" }],
        },
      })
      .catch(() => {});
  });
  await page.goto("/app");
  const input = page.getByRole("combobox", { name: "Starting point" });
  const compare = page.getByRole("button", { name: "Compare routes" });
  await input.fill("Old library");
  await page.getByLabel("Searching locations", { exact: true }).waitFor();
  await input.fill("New library");
  await expect(compare).toBeDisabled();
  const option = page.getByRole("option", {
    name: "Library 405 S MAIN ST · Bentonville",
    exact: true,
  });
  await expect(option).toBeVisible();
  await page.waitForTimeout(1100); // Deliberately allow the older request to finish.
  await expect(page.getByRole("option", { name: /Old library/ })).toHaveCount(
    0,
  );
  await input.press("ArrowDown");
  await input.press("Escape");
  await input.press("Tab");
  await expect(compare).toBeDisabled();
  await input.focus();
  if (isMobile) await option.tap();
  else await option.click();
  await expect(compare).toBeEnabled();
  await input.fill("Library ");
  await expect(compare).toBeDisabled();
  await input.press("Enter");
  expect(comparisons).toBe(0);
});

test("partial official inventories keep school choices usable without caching incomplete results", async ({
  page,
}) => {
  let searches = 0;
  const warning =
    "Some official location sources are temporarily unavailable. Results may be incomplete.";
  await page.route("**/api/locations?**", (route) => {
    searches++;
    return route.fulfill({
      json: {
        warning,
        results: [
          {
            id: "schools-7:19",
            label: "Creekside Middle School",
            point: [36.342294900955686, -94.24165967314097],
            kind: "place",
            type: "school",
            attribution: "City of Bentonville GIS",
          },
        ],
      },
    });
  });
  await page.goto("/app");
  const start = page.getByRole("combobox", {
    name: "Starting point",
    exact: true,
  });
  const compare = page.getByRole("button", {
    name: "Compare routes",
    exact: true,
  });
  await start.fill("creekside ms");
  await expect(page.getByText(warning, { exact: true })).toBeVisible();
  await expect(compare).toBeDisabled();
  const option = page.getByRole("option", {
    name: /Creekside Middle School school · Bentonville/,
  });
  await expect(option).toBeVisible();
  await start.press("ArrowDown");
  await start.press("Enter");
  await expect(compare).toBeEnabled();
  await start.fill("creekside ms");
  await expect(compare).toBeDisabled();
  await expect(option).toBeVisible();
  expect(searches).toBe(2);
  await page.getByRole("button", { name: "Clear starting point" }).click();
  await expect(start).toHaveValue("");
  await expect(compare).toBeDisabled();
});

test("search timeout clears the spinner, gives retry guidance and allows another search", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout = (ms: number) => original(ms === 15000 ? 50 : ms);
  });
  await page.route("**/api/locations?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("q") === "Slow search")
      await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ json: { results: [library] } }).catch(() => {});
  });
  await page.goto("/app");
  const start = page.getByRole("combobox", { name: "Starting point" });
  await start.fill("Slow search");
  await expect(
    page.getByText("Location search timed out. Please try again.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Searching locations", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Compare routes" }),
  ).toBeDisabled();
  await start.fill("Library");
  await expect(
    page.getByRole("option", {
      name: "Library 405 S MAIN ST · Bentonville",
      exact: true,
    }),
  ).toBeVisible();
});
