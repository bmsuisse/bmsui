import { expect, test } from "@playwright/test";

// Drives the demo's `cellEditing` grid — client-side data, no backend
// dependency of its own, but the page also renders the orders grid above it
// (which does hit the real SQL/Meili backend on load), so this still waits
// for the whole page to settle before scrolling down to this grid. This is
// the one place real mouse-drag geometry (range-select, fill-handle) and
// real OS clipboard interaction get verified against an actual browser —
// jsdom has no layout engine and can't meaningfully assert pixel positions.

test.describe("cellEditing — true spreadsheet editing", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/?engine=sql");
    await expect(page.getByRole("cell", { name: "ORD-1001", exact: true })).toBeVisible();
    await page.getByTestId("cell-editing-grid").scrollIntoViewIfNeeded();
  });

  function cell(page: import("@playwright/test").Page, rowId: string, columnId: string) {
    return page.locator(`[data-cell-row="${rowId}"][data-cell-col="${columnId}"]`);
  }

  test("clicking a cell selects it (the range-selection overlay appears)", async ({ page }) => {
    await expect(page.getByTestId("cell-selection-overlay")).not.toBeVisible();
    await cell(page, "1", "title").click();
    await expect(page.getByTestId("cell-selection-overlay")).toBeVisible();
  });

  test("dragging from one cell to another selects a range, shown by the overlay spanning both", async ({ page }) => {
    const start = cell(page, "1", "title");
    const end = cell(page, "3", "title");
    const startBox = await start.boundingBox();
    const endBox = await end.boundingBox();
    if (!startBox || !endBox) throw new Error("cell not visible");

    await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2, { steps: 5 });
    await page.mouse.up();

    const overlay = page.getByTestId("cell-selection-overlay");
    const overlayBox = await overlay.boundingBox();
    if (!overlayBox) throw new Error("overlay not visible");
    // The overlay's height should span all three selected rows, not just one.
    expect(overlayBox.height).toBeGreaterThan(startBox.height * 2);
  });

  test("double-clicking an editable cell opens its editor; typing and pressing Enter commits and moves to the next row", async ({
    page,
  }) => {
    await cell(page, "1", "title").dblclick();
    const editor = page.getByTestId("edit-1-title");
    await expect(editor).toBeVisible();
    await editor.fill("Draft Q4 roadmap");
    await editor.press("Enter");

    await expect(editor).not.toBeVisible();
    await expect(cell(page, "1", "title")).toHaveText("Draft Q4 roadmap");

    // The selection cursor must actually have moved to row 2's same column —
    // not just that row 1's editor closed. F2 (no click) opening row 2's
    // editor directly proves the grid's own keyboard handler picked this
    // commit back up and advanced the cursor, rather than the stale-state
    // read that used to make it silently no-op after every commit.
    await page.keyboard.press("F2");
    await expect(page.getByTestId("edit-2-title")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("selecting an enum option commits immediately, with no Save button anywhere on this grid", async ({ page }) => {
    const grid = page.getByTestId("cell-editing-grid");
    await expect(grid.getByTestId("datagrid-save-edits")).toHaveCount(0);

    await cell(page, "2", "owner").dblclick();
    await page.getByTestId("edit-2-owner").click();
    await page.getByRole("option", { name: "Carol" }).click();

    await expect(cell(page, "2", "owner")).toHaveText("Carol");
  });

  test("copies a selected range to the clipboard as tab-separated text, and pastes a single value across a multi-cell selection", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Clipboard permissions are only granted for chromium in this config.");

    await cell(page, "1", "title").click();
    await page.keyboard.press("Control+c");
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe("Draft Q3 roadmap");

    // Select rows 4-5's "owner" column, then paste a single copied value —
    // it should fill every selected cell (Excel's own paste-one-value
    // behavior), not just the first.
    const start = cell(page, "4", "owner");
    const end = cell(page, "5", "owner");
    const startBox = await start.boundingBox();
    const endBox = await end.boundingBox();
    if (!startBox || !endBox) throw new Error("cell not visible");
    await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2, { steps: 5 });
    await page.mouse.up();

    await page.evaluate(() => navigator.clipboard.writeText("carol"));
    await page.keyboard.press("Control+v");

    await expect(cell(page, "4", "owner")).toHaveText("Carol");
    await expect(cell(page, "5", "owner")).toHaveText("Carol");
  });

  test("dragging the fill handle down copies a cell's value into the rows below it", async ({ page }) => {
    const source = cell(page, "1", "owner");
    await source.click();
    const handle = page.getByTestId("cell-fill-handle");
    await expect(handle).toBeVisible();

    const handleBox = await handle.boundingBox();
    const targetBox = await cell(page, "2", "owner").boundingBox();
    if (!handleBox || !targetBox) throw new Error("fill handle or target cell not visible");

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect(cell(page, "2", "owner")).toHaveText("Alice");
  });
});
