import { defineConfig } from "@playwright/test";

// Opens every story of the built Storybook (`bun run build-storybook` first) in light and dark,
// fails on page errors / console errors, and compares a screenshot to the committed baseline.
// Baselines are rendered on Linux by CI (see .github/workflows/visual-baselines.yml); fonts and
// anti-aliasing differ on macOS, so run `bun run test:visual` locally with SMOKE_ONLY=1.
export default defineConfig({
  testDir: ".",
  testMatch: "stories.spec.ts",
  snapshotPathTemplate: "{testDir}/baselines/{arg}{ext}",
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "report" }]] : "list",
  use: { baseURL: "http://localhost:6007", viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 },
  webServer: {
    command: "bun run serve.ts",
    url: "http://localhost:6007/index.json",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" } },
});
