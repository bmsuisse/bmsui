import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Points straight at source (no build step needed for local dev) —
      // this is what makes `import { Button } from "@bmsuisse/ui"` in App.tsx
      // below resolve, exactly like a real consumer app would write it
      // against the published package.
      "@bmsuisse/ui": fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
});
