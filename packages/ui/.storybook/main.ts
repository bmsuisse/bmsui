import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  typescript: { reactDocgen: "react-docgen-typescript" },
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      // Published to GitHub Pages under /bmsui/storybook/ (see pages.yml).
      base: process.env.BASE_PATH ?? "/",
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          // Same trick as demo/vite.config.ts: stories import the package by
          // name, exactly like a consumer, but resolve to source.
          "@bmsuisse/ui": fileURLToPath(new URL("../src/index.ts", import.meta.url)),
          // The data grid has its own package; its stories (stories/datagrid) import it by name too.
          "@bmsuisse/datagrid": fileURLToPath(new URL("../../datagrid/src/index.ts", import.meta.url)),
        },
      },
    }),
};

export default config;
