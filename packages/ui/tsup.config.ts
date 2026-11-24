import { defineConfig } from "tsup";

export default defineConfig({
  // One entry per source module (not only index.ts): esbuild then emits one small file per component and index.js
  // only re-exports them. A bundler can put each component into the chunk of the app page that uses it, instead of
  // pulling every component the whole app uses into one shared chunk of the first page (one module cannot be split).
  entry: ["src/**/*.{ts,tsx}", "!src/**/*.{test,stories,spec}.{ts,tsx}", "!src/**/__tests__/**"],
  dts: { entry: "src/index.ts" },
  format: ["esm"],
  sourcemap: true,
  clean: true,
  splitting: true,
  external: ["react", "react-dom"],
});
