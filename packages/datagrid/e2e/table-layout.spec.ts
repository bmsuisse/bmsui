import { expect, test } from "@playwright/test";

// Layout behaviour jsdom can't see (no real table layout): a dragged column
// edge following the pointer in a container wider than the table, widths
// surviving a reload, Reset, the active-row wash on odd and even rows, and a
// tree filling a fixed-height box.

test.describe("persisted column widths + reset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId("persisted-columns-demo").scrollIntoViewIfNeeded();
  });

  test("a dragged edge follows the pointer, survives a reload, and Reset restores it", async ({ page }) => {
    const demo = page.getByTestId("persisted-columns-demo");
    const header = demo.getByRole("columnheader", { name: "Category" });
    const before = (await header.boundingBox())!;
    // The table is sized to its columns, not stretched to its wider container.
    const table = demo.getByRole("table");
    expect((await table.boundingBox())!.width).toBeLessThan((await demo.getByTestId("datagrid").boundingBox())!.width - 20);

    const handle = demo.getByTestId("resize-handle-category");
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();

    const after = (await header.boundingBox())!;
    expect(after.width).toBeGreaterThan(before.width + 70);
    expect(after.width).toBeLessThan(before.width + 90);

    await page.reload();
    const restored = (await page.getByTestId("persisted-columns-demo").getByRole("columnheader", { name: "Category" }).boundingBox())!;
    expect(Math.round(restored.width)).toBe(Math.round(after.width));

    await page.getByTestId("persisted-columns-demo").getByRole("button", { name: "Table layout" }).click();
    await page.getByRole("button", { name: "Reset columns" }).click();
    await page.keyboard.press("Escape");
    const reset = (await page.getByTestId("persisted-columns-demo").getByRole("columnheader", { name: "Category" }).boundingBox())!;
    expect(Math.round(reset.width)).toBe(Math.round(before.width));
  });
});

test.describe("row styling", () => {
  test("the active wash shows on odd and even rows", async ({ page }) => {
    await page.goto("/");
    const demo = page.getByTestId("row-styling-demo");
    await demo.scrollIntoViewIfNeeded();
    const grid = demo.getByTestId("datagrid");
    const even = grid.getByTestId("row-s1");
    const odd = grid.getByTestId("row-s2");
    await expect(odd).toHaveAttribute("data-active", "true");
    const oddBg = await odd.evaluate((el) => getComputedStyle(el).backgroundColor);

    await even.getByRole("cell").first().click();
    await expect(even).toHaveAttribute("data-active", "true");
    const evenBg = await even.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(evenBg).toBe(oddBg);
  });

  test("a tree with maxBodyHeight=100% fills its box and scrolls inside it", async ({ page }) => {
    await page.goto("/");
    const demo = page.getByTestId("row-styling-demo");
    await demo.scrollIntoViewIfNeeded();
    const scroll = demo.getByTestId("tree-datagrid").locator("div.overflow-y-auto");
    const { clientHeight, scrollHeight } = await scroll.evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));
    expect(clientHeight).toBeGreaterThan(200);
    expect(clientHeight).toBeLessThan(330);
    expect(scrollHeight).toBeGreaterThan(clientHeight);
  });
});
