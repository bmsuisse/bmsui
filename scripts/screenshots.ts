// Regenerates docs-site/static/img/screenshots/*.png from the two demo
// apps. Run via `bun run screenshots` (repo root) — also invoked by
// .github/workflows/pages.yml on every push to main, so the docs site's
// screenshot gallery never drifts from the actual component behavior.
//
// Builds throwaway, default-base (`/`) copies of both demos specifically
// for this script's own local preview servers — independent of whatever
// BASE_PATH the deploy workflow separately builds them with for the real
// GitHub Pages subpaths.

import { chromium, type Browser } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const OUT_DIR = path.join(ROOT, "docs-site/static/img/screenshots");
const UI_DEMO_DIR = path.join(ROOT, "packages/ui/demo");
const GRID_DEMO_DIR = path.join(ROOT, "packages/datagrid/demo");

function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: "inherit" });
    proc.on("error", reject);
    proc.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} failed (exit ${code}) in ${cwd}`)),
    );
  });
}

interface PreviewServer {
  proc: ChildProcess;
  url: string;
}

function startPreview(cwd: string, port: number): Promise<PreviewServer> {
  const proc = spawn("bunx", ["vite", "preview", "--port", String(port), "--strictPort"], { cwd, stdio: "pipe" });
  const url = `http://localhost:${port}/`;
  return new Promise((resolve, reject) => {
    let settled = false;
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (!settled) reject(new Error(`vite preview exited early (${cwd}), code ${code}`));
    });
    const deadline = Date.now() + 20_000;
    (async function poll() {
      while (Date.now() < deadline) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            settled = true;
            resolve({ proc, url });
            return;
          }
        } catch {
          // not up yet
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      reject(new Error(`Timed out waiting for preview server at ${url}`));
    })();
  });
}

async function captureUiDemo(browser: Browser, url: string): Promise<void> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT_DIR, "ui-light.png"), fullPage: true });

  await page.getByRole("button", { name: /dark mode/i }).click();
  await page.waitForTimeout(150); // let the dark-mode class toggle repaint settle
  await page.screenshot({ path: path.join(OUT_DIR, "ui-dark.png"), fullPage: true });

  await page.close();
}

async function captureDatagridDemo(browser: Browser, url: string): Promise<void> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByTestId("orders-grid").waitFor();
  await page.screenshot({ path: path.join(OUT_DIR, "datagrid-orders.png") });

  await page.getByText("faceted numeric filters").scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(OUT_DIR, "datagrid-histogram.png") });

  // Type into the Task cell to put the grid into "1 pending edit" state —
  // an empty/unedited grid wouldn't show the Save/Discard bar at all, the
  // whole point of this screenshot.
  const editingGrid = page.getByTestId("editing-grid");
  await editingGrid.scrollIntoViewIfNeeded();
  const editingWrapper = editingGrid.locator('xpath=ancestor::div[@data-testid="datagrid"]');
  const titleInput = editingGrid.getByTestId("edit-1-title");
  await titleInput.click();
  await titleInput.fill("Draft Q3 roadmap (revised)");
  await page.waitForTimeout(100);
  await editingWrapper.screenshot({ path: path.join(OUT_DIR, "datagrid-editing.png") });

  const tree = page.getByTestId("tree-datagrid");
  await tree.scrollIntoViewIfNeeded();
  // Scoped to `tree`, not `page` — the orders grid's own row-detail chevrons
  // above use the same aria-label="Expand" convention, so an unscoped
  // locator's `.first()` would click one of those instead.
  const treeExpandButtons = tree.getByRole("button", { name: "Expand" });
  // Each node's fake loader takes ~700ms — wait for the actual children to
  // show up rather than a fixed delay.
  await treeExpandButtons.first().click(); // Engineering
  await tree.getByText("Frontend Team").waitFor();
  await treeExpandButtons.first().click(); // Frontend Team (now first in DOM order)
  // Scoped to `tree`, not `page`, same reasoning as `treeExpandButtons`
  // above — an unscoped locator now also matches the groupBy demo's own
  // "Alice E."/"Alice S."/etc. rows and the editing demo's Owner select
  // (which also just renders the bare text "Alice"), all on the same page.
  await tree.getByText("Alice").waitFor();
  await tree.screenshot({ path: path.join(OUT_DIR, "datagrid-tree.png") });

  await page.close();
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  console.log("Building demo apps...");
  await run("bun", ["run", "build"], UI_DEMO_DIR);
  await run("bun", ["run", "build:static"], GRID_DEMO_DIR);

  console.log("Starting preview servers...");
  const uiServer = await startPreview(UI_DEMO_DIR, 4501);
  const gridServer = await startPreview(GRID_DEMO_DIR, 4502);

  const browser = await chromium.launch();
  try {
    console.log("Capturing @bmsuisse/ui screenshots...");
    await captureUiDemo(browser, uiServer.url);
    console.log("Capturing @bmsuisse/datagrid screenshots...");
    await captureDatagridDemo(browser, gridServer.url);
  } finally {
    await browser.close();
    uiServer.proc.kill();
    gridServer.proc.kill();
  }

  console.log(`Done. Screenshots written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
