import { defineConfig, devices } from "@playwright/test";

// Real-browser checks of Modal/Dialog/Sheet/Tabs against the demo's /modal-lab page, on desktop Chromium,
// an Android-sized Chromium and an iPhone-sized WebKit. WebKit is the one that matters for the iOS
// "stuck modal" class of bugs; set E2E_WEBKIT=0 where it cannot run.
const webkit = process.env.E2E_WEBKIT !== "0";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "report" }]] : "list",
  use: { baseURL: "http://127.0.0.1:5174", trace: "retain-on-failure" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone-chromium", use: { ...devices["Pixel 7"] } },
    ...(webkit ? [{ name: "iphone-webkit", use: { ...devices["iPhone 13"] } }] : []),
  ],
  webServer: {
    command: "bun run dev --host 127.0.0.1",
    cwd: "../demo",
    url: "http://127.0.0.1:5174/modal-lab",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
