import { expect, test } from "@playwright/test";

// Drives the demo's <ColumnSelector> trigger against the real SQL engine
// page — the engine choice doesn't matter for column visibility itself, so
// this sticks to one engine rather than duplicating across both, unlike
// orders.sql.spec.ts/orders.meili.spec.ts which cover engine-specific query
// behavior.

test.describe("Column selector", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?engine=sql");
    await expect(page.getByRole("cell", { name: "ORD-1001" })).toBeVisible();
  });

  test("opens to grouped sections with the right columns under each", async ({ page }) => {
    await page.getByRole("button", { name: "Columns" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Three named groups, per App.tsx's `group` assignments — each a plain
    // label, no bulk-select affordance next to it.
    await expect(dialog.getByText("Details", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Account", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Financial", { exact: true })).toBeVisible();

    // "Details": id, status, created_at.
    await expect(dialog.getByLabel("Order", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Status")).toBeVisible();
    await expect(dialog.getByLabel("Created")).toBeVisible();

    // "Account": customer_name only.
    await expect(dialog.getByLabel("Customer", { exact: true })).toBeVisible();

    // "Financial": amount, is_paid.
    await expect(dialog.getByLabel("Amount")).toBeVisible();
    await expect(dialog.getByLabel("Paid")).toBeVisible();
  });

  test("toggling a column off hides it from the grid, and back on restores it", async ({
    page,
  }) => {
    await expect(page.getByRole("columnheader", { name: "Amount" })).toBeVisible();

    await page.getByRole("button", { name: "Columns" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Amount").uncheck();
    await page.keyboard.press("Escape");

    await expect(page.getByRole("columnheader", { name: "Amount" })).not.toBeVisible();

    await page.getByRole("button", { name: "Columns" }).click();
    await page.getByRole("dialog").getByLabel("Amount").check();
    await page.keyboard.press("Escape");

    await expect(page.getByRole("columnheader", { name: "Amount" })).toBeVisible();
  });

  test("a hidden column set via persistKey survives a real page reload", async ({ page }) => {
    await expect(page.getByRole("columnheader", { name: "Paid" })).toBeVisible();

    await page.getByRole("button", { name: "Columns" }).click();
    await page.getByRole("dialog").getByLabel("Paid").uncheck();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("columnheader", { name: "Paid" })).not.toBeVisible();

    await page.reload();
    await expect(page.getByRole("cell", { name: "ORD-1001" })).toBeVisible();

    // localStorage (via persistKey="orders") restored the hidden column
    // across the reload, not just in-memory React state.
    await expect(page.getByRole("columnheader", { name: "Paid" })).not.toBeVisible();
  });
});
