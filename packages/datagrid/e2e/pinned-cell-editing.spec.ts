import { expect, test } from "@playwright/test";

// Drives the demo's `PinnedCellEditingDemo` grid (pinned-left SKU, pinned-
// right Status, `enableColumnResizing`, `cellEditing`) — the one place a
// pinned column's `position: sticky` cell geometry can be checked against a
// real browser layout engine at all; jsdom's `getBoundingClientRect()` is a
// no-op stub, so this class of bug (see below) is invisible to any unit test.

test.describe("cellEditing + pinned columns — selection overlay tracks sticky cells", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?engine=sql");
    await expect(page.getByRole("cell", { name: "ORD-1001", exact: true })).toBeVisible();
    await page.getByTestId("pinned-cell-editing-grid").scrollIntoViewIfNeeded();
  });

  function cell(page: import("@playwright/test").Page, rowId: string, columnId: string) {
    return page.locator(`[data-cell-row="${rowId}"][data-cell-col="${columnId}"]`);
  }

  test("selecting a pinned-left cell keeps the overlay aligned with it after scrolling the grid sideways", async ({
    page,
  }) => {
    const grid = page.getByTestId("pinned-cell-editing-grid");
    const skuCell = cell(page, "1", "sku");
    await skuCell.click({ modifiers: ["Shift"] });

    const overlay = page.getByTestId("cell-selection-overlay");
    await expect(overlay).toBeVisible();
    const cellBoxBefore = await skuCell.boundingBox();
    const overlayBoxBefore = await overlay.boundingBox();
    if (!cellBoxBefore || !overlayBoxBefore) throw new Error("cell/overlay not visible");
    expect(Math.abs(overlayBoxBefore.x - cellBoxBefore.x)).toBeLessThan(4);

    // SKU is pinned left, so it stays visually in place while the grid
    // itself scrolls sideways underneath it — the overlay (a plain
    // absolutely-positioned div, not itself sticky) must keep tracking it,
    // not drift off by however far the container scrolled.
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="pinned-cell-editing-grid"]') as HTMLElement | null;
      if (el) el.scrollLeft = 200;
    });

    const cellBoxAfter = await skuCell.boundingBox();
    const overlayBoxAfter = await overlay.boundingBox();
    if (!cellBoxAfter || !overlayBoxAfter) throw new Error("cell/overlay not visible after scroll");
    // The pinned cell itself barely moves (still stuck at the left edge);
    // the overlay must stay within a few pixels of it, not drift by the
    // ~200px scrolled.
    expect(Math.abs(overlayBoxAfter.x - cellBoxAfter.x)).toBeLessThan(4);

    await grid.scrollIntoViewIfNeeded();
  });
});
