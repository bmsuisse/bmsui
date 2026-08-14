import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Points straight at source (no build step needed for local dev / the
      // Playwright suite) — this is what makes `import { DataGrid } from
      // "@bmsuisse/datagrid"` in App.tsx below resolve, exactly like a real
      // consumer app would write it against the published package.
      "@bmsuisse/datagrid": fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      // The FastAPI harness in e2e/server (see main.py) — POST /api/sql/...
      // and /api/meili/... both proxy straight through.
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
