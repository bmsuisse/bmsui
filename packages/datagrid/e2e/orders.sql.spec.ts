import { expect, test } from "@playwright/test";

// Exercises the same demo page as orders.meili.spec.ts, pointed at the SQL
// (SQLite, via bmsdna.datagrid.sql) engine instead — real user interactions
// (sort via header click, filter per column type) against the real FastAPI
// harness, not mocked.

test.describe("Orders grid — SQL engine", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?engine=sql");
    await expect(page.getByRole("tab", { name: "SQL (SQLite)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("loads and renders order rows from the fixture data", async ({ page }) => {
    await expect(page.getByRole("cell", { name: "ORD-1001" })).toBeVisible();
    // 20 fixture rows + 1 header row.
    await expect(page.getByRole("row")).toHaveCount(21);
  });

  test("sorts ascending by amount via header click", async ({ page }) => {
    await page.getByRole("button", { name: "Amount", exact: true }).click();

    // ORD-1004 (Blue Bottle Coffee, $15.00) is the smallest amount in the
    // fixture data, so it must be the first data row once sorted ascending.
    const firstDataRow = page.getByRole("row").nth(1);
    await expect(firstDataRow).toContainText("ORD-1004");
  });

  test("reverses to descending on a second header click", async ({ page }) => {
    const amountHeader = page.getByRole("button", { name: "Amount", exact: true });
    await amountHeader.click();
    await amountHeader.click();

    // ORD-1013 (Wayne Enterprises, $12,000.00) is the largest amount.
    const firstDataRow = page.getByRole("row").nth(1);
    await expect(firstDataRow).toContainText("ORD-1013");
  });

  test("filters rows by status via the enum filter widget", async ({ page }) => {
    await page.getByRole("button", { name: "Filter Status" }).click();
    await page.getByRole("button", { name: /Any status/ }).click();
    await page.getByRole("checkbox", { name: "Pending" }).click();
    // Radix's Popover is non-modal, so the grid stays visible to role-based
    // queries with the checkbox list still open — no Escape needed.
    await page.keyboard.press("Escape");

    // 5 "pending" orders in the fixture data (ORD-1002/1006/1009/1014/1018) + header row.
    await expect(page.getByRole("row")).toHaveCount(6);
    await expect(page.getByRole("cell", { name: "ORD-1002" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "ORD-1001" })).not.toBeVisible();
  });

  test("filters rows by status via the enum filter's search box", async ({ page }) => {
    await page.getByRole("button", { name: "Filter Status" }).click();
    await page.getByRole("button", { name: /Any status/ }).click();
    await page.getByPlaceholder("Search status...").fill("cancel");
    await page.getByRole("checkbox", { name: "Cancelled" }).click();
    await page.keyboard.press("Escape");

    // 3 "cancelled" orders in the fixture data + header row.
    await expect(page.getByRole("row")).toHaveCount(4);
  });

  test("toggles dark mode by adding/removing the `dark` class on <html>", async ({ page }) => {
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Dark mode" }).click();
    await expect(html).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Light mode" }).click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("filters rows by a text search on customer name", async ({ page }) => {
    await page.getByRole("button", { name: "Filter Customer" }).click();
    await page.getByPlaceholder("Filter customer...").fill("Acme");

    // Debounced (server mode filter changes wait ~300ms) — assert with
    // Playwright's built-in auto-retrying expect rather than a manual sleep.
    await expect(page.getByRole("row")).toHaveCount(3); // ORD-1001, ORD-1002 + header row
    await expect(page.getByRole("cell", { name: "ORD-1001" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "ORD-1003" })).not.toBeVisible();
  });
});
