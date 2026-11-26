import { expect, type Locator, type Page, test } from "@playwright/test";

const DESKTOP_MIN = 1024;

async function isPhone(page: Page): Promise<boolean> {
  return (page.viewportSize()?.width ?? DESKTOP_MIN) < DESKTOP_MIN;
}

const dialogs = (page: Page): Locator => page.locator('[role="dialog"]');
const topDialog = (page: Page): Locator => dialogs(page).last();

/** Asserts the page behind a closed modal is fully usable: nothing left in the DOM, nothing catching taps. */
async function describeStuckDialog(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.querySelector('[role="dialog"]');
    if (!el) return "no dialog element";
    const animations = el.getAnimations().map((a) => `${a.playState}@${Math.round(Number(a.currentTime ?? 0))}ms`);
    return JSON.stringify({
      attributes: Array.from(el.attributes).map((a) => a.name).filter((n) => n.startsWith("data-") || n === "inert" || n === "style"),
      animations,
      visibility: document.visibilityState,
    });
  });
}

async function expectClean(page: Page): Promise<void> {
  try {
    await expect(dialogs(page)).toHaveCount(0, { timeout: 3000 });
  } catch (error) {
    throw new Error(`dialog still mounted 3 s after closing: ${await describeStuckDialog(page)}`, { cause: error });
  }
  await expect(page.locator('[data-slot="sheet-overlay"], [data-slot="sheet-content"]')).toHaveCount(0);
  const state = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const root = document.getElementById("root");
    return {
      overflow: body.overflow,
      position: body.position,
      pointerEvents: body.pointerEvents,
      rootInert: root?.hasAttribute("inert") ?? false,
      rootHidden: root?.getAttribute("aria-hidden") === "true",
      bodyHiddenChildren: Array.from(document.body.children).filter((el) => el.hasAttribute("inert") || el.getAttribute("aria-hidden") === "true").length,
    };
  });
  expect(state.overflow).not.toBe("hidden");
  expect(state.position).not.toBe("fixed");
  expect(state.pointerEvents).not.toBe("none");
  expect(state.rootInert).toBe(false);
  expect(state.rootHidden).toBe(false);
  expect(state.bodyHiddenChildren).toBe(0);

  const counter = page.getByTestId("page-counter");
  const before = Number((await counter.innerText()).replace(/\D/g, ""));
  try {
    await counter.click({ timeout: 3000 });
  } catch (error) {
    const info = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="page-counter"]');
      const r = el?.getBoundingClientRect();
      const hit = r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
      return JSON.stringify({ rect: r && [r.x, r.y, r.width, r.height], hit: hit?.outerHTML.slice(0, 120), vw: innerWidth, vh: innerHeight, scrollY });
    });
    throw new Error(`page counter not clickable: ${info}`, { cause: error });
  }
  await expect(counter).toHaveText(`Page button: ${before + 1}`);

  await page.evaluate(() => window.scrollTo(0, 300));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function closeViaX(page: Page): Promise<void> {
  await topDialog(page).getByRole("button", { name: "Close", exact: true }).first().click();
}
async function closeViaBackdrop(page: Page): Promise<void> {
  await page.mouse.click(4, 4);
}
async function closeViaEscape(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
}

/** Waits for running animations (the sheet's slide-in) so positions are measured at rest. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
}

async function expectInViewport(page: Page, locator: Locator): Promise<void> {
  await settle(page);
  const box = await locator.boundingBox();
  const size = page.viewportSize();
  expect(box, "element has a box").not.toBeNull();
  if (!box || !size) return;
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
}

test.beforeEach(async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/favicon|DevTools/i.test(message.text())) problems.push(message.text());
  });
  await page.goto("/modal-lab");
  await expect(page.getByTestId("page-counter")).toBeVisible();
  test.info().annotations.push({ type: "console-problems", description: "checked in afterEach" });
  (page as Page & { __problems?: string[] }).__problems = problems;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { __problems?: string[] }).__problems ?? []).toEqual([]);
});

const closers = [
  ["X button", closeViaX],
  ["Escape", closeViaEscape],
  ["backdrop tap", closeViaBackdrop],
] as const;

const scenarios = ["basic", "tall", "form", "centered", "back", "composed", "unmount", "confirm", "formmodal", "panel"] as const;

for (const scenario of scenarios) {
  for (const [closerName, closer] of closers) {
    test(`${scenario}: opens and closes via ${closerName}, page stays usable`, async ({ page }) => {
      await page.getByTestId(`open-${scenario}`).click();
      const dialog = topDialog(page);
      await expect(dialog).toBeVisible();
      await expectInViewport(page, dialog);

      const phone = await isPhone(page);
      const isSheet = (await dialog.getAttribute("data-slot")) === "sheet-content";
      if (scenario === "centered") expect(isSheet).toBe(false);
      else expect(isSheet).toBe(phone);

      await closer(page);
      await expectClean(page);
    });
  }
}

test("repeated open/close cycles never leave residue", async ({ page }) => {
  for (let i = 0; i < 6; i++) {
    await page.getByTestId("open-basic").click();
    await expect(topDialog(page)).toBeVisible();
    await closeViaEscape(page);
    await expectClean(page);
  }
});

test("tall body scrolls inside the modal while header and footer stay in view", async ({ page }) => {
  await page.getByTestId("open-tall").click();
  const dialog = topDialog(page);
  await expect(dialog).toBeVisible();
  const body = dialog.locator('[data-slot="dialog-body"]');
  const overflowing = await body.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(overflowing).toBe(true);
  await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expectInViewport(page, page.getByTestId("tall-done"));
  await expectInViewport(page, dialog);
  await expect(dialog.getByRole("heading", { name: "Tall body" })).toBeInViewport();
  await page.getByTestId("tall-done").click();
  await expectClean(page);
});

test("scrolling the modal does not scroll the page behind it", async ({ page }) => {
  await page.getByTestId("open-tall").click();
  await expect(topDialog(page)).toBeVisible();
  const body = topDialog(page).locator('[data-slot="dialog-body"]');
  await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await closeViaEscape(page);
  await expectClean(page);
});

test("nested modals: Escape and the X close only the top one", async ({ page }) => {
  await page.getByTestId("open-nested-1").click();
  await expect(dialogs(page)).toHaveCount(1);
  await page.getByTestId("nested-open-2").click();
  await expect(dialogs(page)).toHaveCount(2);
  await page.getByTestId("nested-open-3").click();
  await expect(dialogs(page)).toHaveCount(3);

  await closeViaEscape(page);
  await expect(dialogs(page)).toHaveCount(2);
  await closeViaX(page);
  await expect(dialogs(page)).toHaveCount(1);
  await closeViaEscape(page);
  await expectClean(page);
});

test("rapid: open then close within 30 ms leaves nothing behind", async ({ page }) => {
  await page.getByTestId("rapid-open-close").click();
  await page.waitForTimeout(1200);
  await expectClean(page);
});

test("rapid: five flips in 160 ms end open and usable, then close cleanly", async ({ page }) => {
  await page.getByTestId("rapid-flip").click();
  await page.waitForTimeout(900);
  const dialog = topDialog(page);
  await expect(dialog).toBeVisible();
  await expectInViewport(page, dialog);
  await expect(page.getByTestId("basic-done")).toBeInViewport();
  await page.getByTestId("basic-done").click();
  await expectClean(page);
});

test("rapid: reopening during the exit animation does not hold the sheet off-screen", async ({ page }) => {
  await page.getByTestId("rapid-reopen-mid-exit").click();
  await page.waitForTimeout(1500);
  const dialog = topDialog(page);
  await expect(dialog).toBeVisible();
  await expectInViewport(page, dialog);
  await expect(page.getByTestId("basic-done")).toBeInViewport();
  await closeViaEscape(page);
  await expectClean(page);
});

for (const scenario of ["basic", "centered"] as const) {
  test(`${scenario}: withheld animation frames (backgrounded page) cannot leave a closed dialog mounted`, async ({ page }) => {
    await page.getByTestId(`open-${scenario}`).click();
    await expect(topDialog(page)).toBeVisible();
    await page.waitForTimeout(700);
    // Base UI unmounts from a requestAnimationFrame callback; stall them as an iOS background tab does.
    await page.evaluate(() => {
      window.requestAnimationFrame = () => 0;
    });
    await closeViaEscape(page);
    await expectClean(page);
  });
}

test("a stalled animation timeline cannot leave an invisible overlay behind (watchdog)", async ({ page }) => {
  await page.getByTestId("open-basic").click();
  await expect(topDialog(page)).toBeVisible();
  await page.waitForTimeout(700);
  // Pause every animation that starts from now on: the exit never advances by itself.
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element["animate"]>) {
      const animation = original.apply(this, args);
      animation.pause();
      return animation;
    };
  });
  await closeViaEscape(page);
  await expectClean(page);
});

test("tabs inside a modal: every tab is reachable and the active one is scrolled into view", async ({ page }) => {
  await page.getByTestId("open-tabs").click();
  await expect(topDialog(page)).toBeVisible();
  for (const name of ["one", "two", "three", "four", "five", "six", "seven"]) {
    const tab = page.getByTestId(`tab-${name}`);
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId(`panel-${name}`)).toBeVisible();
    await expect(tab).toBeInViewport();
  }
  await closeViaEscape(page);
  await expectClean(page);
});

test("header actions and back arrow work and do not collide with the close button", async ({ page }) => {
  await page.getByTestId("open-back").click();
  const dialog = topDialog(page);
  await expect(dialog).toBeVisible();
  const action = page.getByTestId("header-action");
  const close = dialog.getByRole("button", { name: "Close", exact: true }).first();
  const [a, c] = [await action.boundingBox(), await close.boundingBox()];
  expect(a && c && a.x + a.width <= c.x + 1).toBe(true);
  const title = dialog.getByRole("heading").first();
  const t = await title.boundingBox();
  // The close button sits on the title's row, not above it.
  expect(c && t && Math.abs(c.y + c.height / 2 - (t.y + t.height / 2)) < 24).toBe(true);
  if (c && (await isPhone(page))) expect(Math.min(c.width, c.height)).toBeGreaterThanOrEqual(43);
  await dialog.getByTestId("modal-back").click();
  await expect(page.getByTestId("log")).toHaveText("back");
  await closeViaEscape(page);
  await expectClean(page);
});

test("rotating the device or resizing the window while a modal is open keeps it usable", async ({ page }) => {
  const size = page.viewportSize();
  test.skip(!size, "needs a viewport");
  if (!size) return;
  await page.getByTestId("open-form").click();
  await expect(topDialog(page)).toBeVisible();
  await page.setViewportSize({ width: size.height, height: size.width });
  await page.waitForTimeout(500);
  await expect(topDialog(page)).toBeVisible();
  await expectInViewport(page, topDialog(page));
  await page.setViewportSize(size);
  await page.waitForTimeout(500);
  await expect(topDialog(page)).toBeVisible();
  await expectInViewport(page, topDialog(page));
  await closeViaEscape(page);
  await expectClean(page);
});

test("crossing the breakpoint while open keeps the typed draft and the same surface", async ({ page }) => {
  const size = page.viewportSize();
  if (!size) throw new Error("needs a viewport");
  await page.getByTestId("open-form").click();
  await expect(topDialog(page)).toBeVisible();
  const slotBefore = await topDialog(page).getAttribute("data-slot");
  await page.getByTestId("field-Email").fill("draft@example.com");
  // Wide enough for desktop if we are a phone, phone-sized if we are desktop: the other side of 1024px.
  const crossed = size.width < DESKTOP_MIN ? { width: 1280, height: 800 } : { width: 700, height: 900 };
  await page.setViewportSize(crossed);
  await page.waitForTimeout(500);
  await expect(topDialog(page)).toBeVisible();
  await expect(page.getByTestId("field-Email")).toHaveValue("draft@example.com");
  expect(await topDialog(page).getAttribute("data-slot")).toBe(slotBefore);
  await closeViaEscape(page);
  await expectClean(page);
  // Closed, it follows the viewport again.
  await page.getByTestId("open-form").click();
  await expect(topDialog(page)).toBeVisible();
  const expectSheet = crossed.width < DESKTOP_MIN;
  expect((await topDialog(page).getAttribute("data-slot")) === "sheet-content").toBe(expectSheet);
  await closeViaEscape(page);
  await expectClean(page);
});

test("the sheet slide-in and slide-out animations really run", async ({ page }) => {
  test.skip(!(await isPhone(page)), "sheet only");
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    (window as unknown as { __animated: string[] }).__animated = [];
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element["animate"]>) {
      (window as unknown as { __animated: string[] }).__animated.push(this.getAttribute("data-slot") ?? this.tagName);
      return original.apply(this, args);
    };
  });
  await page.getByTestId("open-basic").click();
  await expect(topDialog(page)).toBeVisible();
  await closeViaEscape(page);
  await expectClean(page);
  const animated = await page.evaluate(() => (window as unknown as { __animated: string[] }).__animated);
  // enter + exit of the sheet itself
  expect(animated.filter((slot) => slot === "sheet-content").length).toBeGreaterThanOrEqual(2);
});

test("a focused input stays inside the visible sheet", async ({ page }) => {
  await page.getByTestId("open-form").click();
  await expect(topDialog(page)).toBeVisible();
  const field = page.getByTestId("field-Phone");
  await field.click();
  await field.fill("079 123 45 67");
  await expectInViewport(page, topDialog(page));
  await expect(field).toBeInViewport();
  await closeViaEscape(page);
  await expectClean(page);
});

test("phone: the drag handle resizes the sheet", async ({ page }) => {
  test.skip(!(await isPhone(page)), "sheet only");
  await page.getByTestId("open-basic").click();
  const handle = page.getByTestId("sheet-drag-handle");
  await expect(handle).toBeVisible();
  const before = await topDialog(page).boundingBox();
  const grip = await handle.boundingBox();
  if (!before || !grip) throw new Error("no boxes");
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, grip.y - 150, { steps: 6 });
  await page.mouse.up();
  const after = await topDialog(page).boundingBox();
  expect(after?.height ?? 0).toBeGreaterThan(before.height + 50);
  await closeViaEscape(page);
  await expectClean(page);
});

test("tabs: selecting the last tab programmatically scrolls it into view inside the modal", async ({ page }) => {
  await page.getByTestId("open-tabs").click();
  await expect(topDialog(page)).toBeVisible();
  const list = topDialog(page).getByRole("tablist");
  const overflows = await list.evaluate((el) => el.scrollWidth > el.clientWidth);
  if (overflows) {
    const mask = await list.evaluate((el) => {
      const style = getComputedStyle(el);
      return style.maskImage || style.webkitMaskImage || "none";
    });
    expect(mask, "an overflowing tab row fades at its edge").not.toBe("none");
  }
  await page.getByTestId("tabs-select-last").click();
  await expect(page.getByTestId("tab-seven")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("tab-seven")).toBeInViewport({ ratio: 0.9, timeout: 3000 });
  if (overflows) expect(await list.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await closeViaEscape(page);
  await expectClean(page);
});

test("chips: a row that overflows scrolls the selected chip into view", async ({ page }) => {
  const phone = await isPhone(page);
  const list = page.getByTestId("chips-list");
  if (phone) expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.getByTestId("chips-select-last").click();
  await expect(page.getByTestId("chip-c11")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("chip-c11")).toBeInViewport({ ratio: 0.9, timeout: 3000 });
  if (phone) expect(await list.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
});

test("tabs overflow=menu: the rest sit in a More menu, picking one promotes it into the row", async ({ page }) => {
  const more = page.getByTestId("tabs-overflow");
  await expect(more).toBeVisible();
  await expect(page.getByTestId("mtab-m0")).toBeVisible();
  // The last tab does not fit: invisible and not reachable by keyboard.
  await expect(page.getByTestId("mtab-m8")).toBeHidden();
  const stops = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-tab-value^="m"]')).filter((el) => el.getAttribute("aria-hidden") === "true" && el.tabIndex >= 0).length,
  );
  expect(stops).toBe(0);

  await more.click();
  await page.locator('[data-tab-menu-value="m8"]').click();
  await expect(page.getByTestId("mtab-m8")).toBeVisible();
  await expect(page.getByTestId("mtab-m8")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("mtab-m8")).toBeInViewport({ ratio: 0.9 });

  // The setting: back to a sideways-scrolling row.
  await page.getByTestId("overflow-toggle").click();
  await expect(page.getByTestId("tabs-overflow")).toHaveCount(0);
});
