// Tiny static file server for the built Storybook (storybook-static), used by playwright.config.ts.
import { join, normalize } from "node:path";

const root = join(import.meta.dir, "..", "storybook-static");
const port = Number(process.env.PORT ?? 6007);

Bun.serve({
  port,
  async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname);
    const relative = normalize(path === "/" ? "/index.html" : path);
    if (relative.includes("..")) return new Response("forbidden", { status: 403 });
    const file = Bun.file(join(root, relative));
    return (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 });
  },
});
console.log(`serving ${root} on :${port}`);
