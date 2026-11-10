import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as ui from "../src/index";

// CATALOG.md is what agents in consuming apps read before building a local
// component. Keep it complete: every runtime export must be listed in backticks.
describe("CATALOG.md", () => {
  const catalog = readFileSync(resolve(__dirname, "../CATALOG.md"), "utf8");

  it("lists every runtime export", () => {
    const missing = Object.keys(ui).filter((name) => !catalog.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });

  it("is shipped in the npm package", () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8")) as { files: string[] };
    expect(pkg.files).toContain("CATALOG.md");
  });
});
