import { expect, test } from "@playwright/test";

for (const width of [375, 768, 1280]) {
  test(`pinned selection and name columns do not overlap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?engine=sql");
    const grid = page.getByTestId("pinned-auto-layout-grid");
    await grid.scrollIntoViewIfNeeded();
    const row = grid.getByTestId("row-contact-1");
    await expect(row).toBeVisible();

    const geometry = () => row.evaluate((element) =>
      Array.from(element.children).map((cell) => {
        const rect = cell.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      }),
    );
    const before = await geometry();
    expect(before[0].width).toBeGreaterThanOrEqual(43);
    expect(before[1].width).toBeGreaterThanOrEqual(199);
    expect(Math.abs(before[1].left - before[0].right)).toBeLessThan(1);
    expect(Math.abs(before[2].left - before[1].right)).toBeLessThan(1);

    await grid.evaluate((element) => { element.scrollLeft = 100; });
    await expect.poll(() => grid.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    const after = await geometry();
    expect(Math.abs(after[0].left - before[0].left)).toBeLessThan(1);
    expect(Math.abs(after[1].left - after[0].right)).toBeLessThan(1);
  });
}
