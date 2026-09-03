import { expect, test } from "@playwright/test";

// Regression test for TreeDataGrid's <thead> never getting the
// sticky-to-top-of-scroll-container treatment <DataGrid>'s own header cells
// have (see headerCellClassAndStyle's `{ sticky: true }` in DataGrid.tsx) —
// scrolling this grid used to scroll the header row away with the body
// instead of pinning it in place. jsdom's `getBoundingClientRect()`/computed
// `position` are no-op stubs (see pinned-cell-editing.spec.ts's own note),
// so this class of bug is invisible to any unit test — only a real browser
// layout engine can catch it.

test.describe("TreeDataGrid — sticky header", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tree-virtualized-grid").scrollIntoViewIfNeeded();
  });

  test("header cell renders as position: sticky, pinned to the top of the grid's own scroll container", async ({
    page,
  }) => {
    const header = page.getByTestId("tree-virtualized-grid").getByRole("columnheader", { name: "Name" });
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS("position", "sticky");
    await expect(header).toHaveCSS("top", "0px");
  });

  test("header stays pinned in place while the body scrolls underneath it", async ({ page }) => {
    const grid = page.getByTestId("tree-virtualized-grid");
    const header = grid.getByRole("columnheader", { name: "Name" });

    const boxBefore = await header.boundingBox();
    if (!boxBefore) throw new Error("header not visible");
    await expect(page.getByRole("cell", { name: "Row 1", exact: true })).toBeVisible();

    await grid.evaluate((el) => {
      el.scrollTop = 2000;
    });

    // The header's own bounding box barely moves (still pinned at the top
    // of the scroll container) even though the grid scrolled 2000px...
    const boxAfter = await header.boundingBox();
    if (!boxAfter) throw new Error("header not visible after scroll");
    expect(Math.abs(boxAfter.y - boxBefore.y)).toBeLessThan(2);

    // ...while the row that used to sit right under the header has long
    // since scrolled out from underneath it.
    await expect(page.getByRole("cell", { name: "Row 1", exact: true })).not.toBeVisible();
  });
});
