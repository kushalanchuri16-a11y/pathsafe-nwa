import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const repaired = JSON.parse(
  readFileSync("data/reliability/case-10.json", "utf8"),
);
test("reported trip renders supported candidates and discloses the excluded route", async ({
  page,
}) => {
  await page.route("**/api/locations?**", (r) =>
    r.fulfill({
      json: {
        results: [
          r.request().url().includes("3809")
            ? repaired.selected
            : repaired.destination,
        ],
      },
    }),
  );
  await page.route("**/api/compare", (r) => r.fulfill({ json: repaired.body }));
  await page.goto("/app");
  for (const [label, q] of [
    ["Starting point", "3809 SW MISTLETOE AVE"],
    ["Destination", "Crystal Bridges"],
  ]) {
    const input = page.getByRole("combobox", { name: label, exact: true });
    await input.fill(q);
    await page.getByRole("listbox", { name: `${label} suggestions` }).waitFor();
    await input.press("ArrowDown");
    await input.press("Enter");
  }
  await page.getByRole("button", { name: "Compare routes" }).click();
  await expect(page.getByText("REAL DATA · V1", { exact: true })).toBeVisible();
  await expect(page.locator(".route-card")).toHaveCount(2);
  await expect
    .poll(async () =>
      page.locator(".leaflet-tooltip").evaluateAll((elements) =>
        elements
          .filter(
            (e) =>
              e.textContent?.startsWith("Start ·") ||
              e.textContent?.startsWith("Destination ·"),
          )
          .filter((e) => {
            const b = e.getBoundingClientRect(),
              m = e.closest(".leaflet-container")!.getBoundingClientRect();
            return (
              b.left < m.left ||
              b.right > m.right ||
              b.top < m.top ||
              b.bottom > m.bottom
            );
          })
          .map((e) => e.textContent),
      ),
    )
    .toEqual([]);

  await expect(
    page.getByRole("heading", { name: "Check your locations" }),
  ).toHaveCount(0);
  await page.getByText("Data sources & limitations", { exact: true }).click();
  await expect(
    page.getByText(/1 provider alternative\(s\) excluded/),
  ).toBeVisible();
});
test("unsupported provider routes do not blame valid endpoints; stale searches cannot reappear after clear", async ({
  page,
}) => {
  await page.route("**/api/compare", (r) =>
    r.fulfill({
      status: 422,
      json: {
        code: "ROUTE_OUTSIDE_SUPPORTED_AREA",
        error:
          "No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.",
      },
    }),
  );
  await page.goto("/app");
  await page.getByRole("button", { name: "Compare routes" }).click();
  await expect(
    page.getByRole("heading", {
      name: "No supported walking route",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Check your locations" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.route("**/api/locations?**", async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await r.fulfill({ json: { results: [repaired.selected] } }).catch(() => {});
  });
  const start = page.getByRole("combobox", {
    name: "Starting point",
    exact: true,
  });
  await start.fill("3809");
  await page.getByLabel("Searching locations", { exact: true }).waitFor();
  await start.fill("");
  await expect(
    page.locator(".location-options").getByRole("option"),
  ).toHaveCount(0);
  await expect(start).toHaveValue("");
  await page.waitForTimeout(600);
  await expect(
    page.locator(".location-options").getByRole("option"),
  ).toHaveCount(0);
});
