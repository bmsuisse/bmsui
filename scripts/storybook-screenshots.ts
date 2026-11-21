// Screenshots of selected Storybook stories (light + dark) into
// packages/ui/stories/screenshots. Run `bun run build-storybook` in
// packages/ui first, then `bun run scripts/storybook-screenshots.ts`.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const STATIC_DIR = path.join(ROOT, "packages/ui/storybook-static");
const OUT_DIR = path.join(ROOT, "packages/ui/stories/screenshots");

interface Shot {
  name: string;
  id: string;
  /** Click this button first (for stories that open a sheet). */
  open?: string;
  width?: number;
  height?: number;
}

const SHOTS: Shot[] = [
  { name: "score-badge", id: "patterns-scorebadge--high" },
  { name: "score-badge-ranks", id: "patterns-scorebadge--ranks" },
  { name: "facet-filter", id: "patterns-facetfilter--preselected", width: 420, height: 760 },
  { name: "active-chips", id: "patterns-facetfilter--with-active-chips", width: 420, height: 880 },
  { name: "facet-collapsible", id: "patterns-facetfilter--collapsible-and-single", width: 420, height: 520 },
  { name: "facet-data-types", id: "patterns-facetfilter--data-types", width: 440, height: 900 },
  { name: "facet-loading", id: "patterns-facetfilter--loading", width: 360, height: 420 },
  { name: "facet-german", id: "patterns-facetfilter--german", width: 420, height: 760 },
  { name: "empty-state", id: "patterns-emptystate--default", width: 520, height: 320 },
  { name: "status-badges", id: "patterns-statusbadge--all-tones", width: 480, height: 120 },
  { name: "facet-dropdown", id: "patterns-facetfilter--dropdown", width: 420, height: 420 },
  { name: "facet-load-more", id: "patterns-facetfilter--load-more", width: 420, height: 780 },
  { name: "result-card", id: "patterns-resultcard--product-list", width: 560, height: 360 },
  { name: "search-bar-actions", id: "patterns-searchbar--with-actions", width: 520, height: 140 },
  { name: "filter-sheet", id: "patterns-filtersheet--with-apply", open: "Filters", width: 900, height: 640 },
  { name: "filter-sheet-mobile", id: "patterns-filtersheet--with-apply", open: "Filters", width: 390, height: 720 },
  { name: "pwa-update-available", id: "patterns-updateprompt--available", width: 900, height: 80 },
  { name: "pwa-update-updating", id: "patterns-updateprompt--updating", width: 900, height: 120 },
  { name: "pwa-update-blocked", id: "patterns-updateprompt--blocked-by-unsaved-work", width: 900, height: 140 },
  { name: "pwa-update-german", id: "patterns-updateprompt--german", width: 900, height: 80 },
  { name: "pwa-update-phone", id: "patterns-updateprompt--phone", width: 390, height: 140 },
  { name: "pwa-install-native", id: "patterns-installprompt--native", width: 440, height: 200 },
  { name: "pwa-install-ios", id: "patterns-installprompt--ios", width: 440, height: 200 },
  { name: "pwa-install-ios-guide", id: "patterns-installprompt--ios", open: "^Install$", width: 900, height: 640 },
  { name: "pwa-install-ios-guide-mobile", id: "patterns-installprompt--ios", open: "^Install$", width: 390, height: 720 },
  { name: "pwa-install-banner", id: "patterns-installprompt--banner", width: 900, height: 80 },
  { name: "pwa-offline", id: "patterns-offlineindicator--offline", width: 900, height: 80 },
];

const SELECTED = SHOTS.filter((shot) => !process.env.ONLY || shot.name.startsWith(process.env.ONLY));

const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const url = new URL(req.url);
    const file = Bun.file(path.join(STATIC_DIR, url.pathname === "/" ? "index.html" : url.pathname));
    return (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 });
  },
});

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  for (const theme of ["light", "dark"] as const) {
    for (const shot of SELECTED) {
      const page = await browser.newPage({
        viewport: { width: shot.width ?? 600, height: shot.height ?? 300 },
        deviceScaleFactor: 2,
      });
      await page.goto(
        `http://localhost:${server.port}/iframe.html?id=${shot.id}&viewMode=story&globals=theme:${theme}`,
      );
      await page.waitForSelector("#storybook-root > *", { timeout: 15_000 });
      if (shot.open) {
        await page.getByRole("button", { name: new RegExp(shot.open) }).click();
        await page.getByRole("dialog").waitFor();
      }
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT_DIR, `${shot.name}-${theme}.png`), fullPage: !shot.open });
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.stop();
}
console.log(`wrote screenshots to ${OUT_DIR}`);
