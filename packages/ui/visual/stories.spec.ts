import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

interface Entry {
  id: string;
  type: "story" | "docs";
  title: string;
  name: string;
  tags?: string[];
}

const index = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../storybook-static/index.json"), "utf8")) as {
  entries: Record<string, Entry>;
};
const stories = Object.values(index.entries).filter((entry) => entry.type === "story");
const smokeOnly = process.env.SMOKE_ONLY === "1";

// A story tagged "no-visual" (e.g. a live clock, random data) still has to render without errors.
const IGNORED_CONSOLE = [/Download the React DevTools/i, /favicon/i];

for (const theme of ["light", "dark"] as const) {
  test.describe(theme, () => {
    for (const story of stories) {
      test(`${story.title} / ${story.name}`, async ({ page }) => {
        const problems: string[] = [];
        page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          if (message.type() === "error" && !IGNORED_CONSOLE.some((re) => re.test(message.text()))) {
            problems.push(`console.error: ${message.text()}`);
          }
        });

        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`);
        await page.waitForSelector("#storybook-root > *, .sb-errordisplay.sb-show-errordisplay", { timeout: 15_000 });
        await expect(page.locator(".sb-errordisplay.sb-show-errordisplay")).toHaveCount(0);
        await page.waitForTimeout(250);
        expect(problems, "page and console errors while rendering").toEqual([]);

        if (!smokeOnly && !story.tags?.includes("no-visual")) {
          await expect(page).toHaveScreenshot(`${theme}/${story.id}.png`);
        }
      });
    }
  });
}
