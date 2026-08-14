import { defineConfig, devices } from "@playwright/test";

const MEILI_MASTER_KEY = "bmsui-datagrid-dev-master-key";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      // Idempotent download + a fresh Meilisearch data dir per run (via
      // `mktemp -d`) — `cwd` is the repo root, since both the setup script
      // and the downloaded binary live under e2e/server/ there.
      command: `./e2e/server/scripts/setup-meilisearch.sh && ./e2e/server/bin/meilisearch --db-path "$(mktemp -d)" --http-addr 127.0.0.1:7700 --master-key ${MEILI_MASTER_KEY} --no-analytics`,
      cwd: "../..",
      url: "http://127.0.0.1:7700/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "uv run uvicorn main:app --port 8000",
      cwd: "../../e2e/server",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { MEILISEARCH_API_KEY: MEILI_MASTER_KEY },
    },
    {
      command: "bun run dev",
      cwd: "./demo",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
