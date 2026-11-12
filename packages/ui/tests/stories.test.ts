import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as ui from "../src/index";

// Every exported component and hook has a Storybook story (stories/*.stories.tsx), so the published
// Storybook shows the whole library. Same idea as tests/catalog.test.ts for CATALOG.md: add the
// story in the same change as the export. A story only has to MENTION the export by name; compound
// sub-parts are usually shown inside their parent's story.
//
// Exports that deliberately have none go here, each with the reason. The test also fails when an
// entry gets a story (or disappears), so the list can't go stale.
const NOT_STORIED: Record<string, string> = {
  PopoverAnchor: "compound part; positioning only, no UI of its own",
  DropdownMenuGroup: "compound part of DropdownMenu",
  DropdownMenuPortal: "compound part of DropdownMenu, no UI",
  SheetClose: "compound part of Sheet",
  SheetPortal: "compound part of Sheet, no UI",
  Announcer: "invisible live region; nothing to look at",
  CommandRegistryProvider: "context plumbing for CommandPalette",
  useRegisterCommands: "registers commands into CommandRegistryProvider; no UI",
  useRegisteredCommands: "reads CommandRegistryProvider; no UI",
  useDelayedFlag: "timer hook behind LoadingState; shown through its stories",
  useSidebarCollapsed: "reads Sidebar's context; shown through Sidebar stories",
  useSpeechRecognition: "needs a microphone; shown through the Voice stories (fake engine)",
  useMergedRefs: "ref utility, no UI",
};

// `@bmsuisse/datagrid` shares this Storybook (stories/datagrid). Its exports are read from the
// source of its index (a regex over `export { ... }`, no import: the grid pulls in a lot).
const NOT_STORIED_DATAGRID: Record<string, string> = {
  useFilterLabels: "reads FilterLabelsProvider; shown through the filter stories",
  useEditingState: "state machine behind DataGrid/TreeDataGrid `editing`; shown through the editing stories",
  useCellEditingState: "state behind DataGrid `cellEditing`; shown through the CellEditing stories",
  useCellSelection: "selection state behind DataGrid `cellEditing`; shown through the CellEditing stories",
  SelectionOverlay: "drawn by DataGrid `cellEditing`; shown through the CellEditing stories",
  useGridState: "sort/filter/page state behind DataGrid; shown through every DataGrid story",
  useDebouncedCallback: "timer utility, no UI",
  useGroupExpansion: "group collapse state behind `groupBy`; shown through the grouping stories",
  useStickyGroupHeaderTop: "layout measurement behind `groupBy`; no UI of its own",
  useVisibleColumns: "column filtering behind DataGrid/TreeDataGrid; shown through the ColumnSelector stories",
  useTreeState: "expansion/loading state behind TreeDataGrid; shown through the TreeDataGrid stories",
};

const storyFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? storyFiles(resolve(dir, entry.name))
      : entry.name.endsWith(".stories.tsx")
        ? [resolve(dir, entry.name)]
        : [],
  );

const storyText = (): string =>
  storyFiles(resolve(__dirname, "../stories"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

const datagridExports = (): string[] => {
  const source = readFileSync(resolve(__dirname, "../../datagrid/src/index.ts"), "utf8");
  const names: string[] = [];
  for (const match of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of (match[1] ?? "").split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.push(name);
    }
  }
  return names;
};
const mentioned = (text: string, name: string): boolean => new RegExp(`\\b${name}\\b`).test(text);

describe("Storybook coverage", () => {
  // Components (`Button`) and hooks (`useHotkeys`); ALL_CAPS constants and plain helpers are not UI.
  const candidates = Object.keys(ui).filter((name) => /^(use[A-Z]|[A-Z][a-z])/.test(name));

  it("has a story for every exported component and hook", () => {
    const text = storyText();
    const missing = candidates.filter((name) => !(name in NOT_STORIED) && !mentioned(text, name));
    expect(
      missing,
      `Add a story in packages/ui/stories/ for: ${missing.join(", ")} (or list it in NOT_STORIED with a reason)`,
    ).toEqual([]);
  });

  it("keeps the NOT_STORIED list honest", () => {
    const text = storyText();
    const stale = Object.keys(NOT_STORIED).filter((name) => !candidates.includes(name) || mentioned(text, name));
    expect(stale, "remove these from NOT_STORIED: they now have a story or are no longer exported").toEqual([]);
  });

  describe("@bmsuisse/datagrid", () => {
    const grid = datagridExports().filter((name) => /^(use[A-Z]|[A-Z][a-z])/.test(name));

    it("has a story for every exported component and hook", () => {
      const text = storyText();
      const missing = grid.filter((name) => !(name in NOT_STORIED_DATAGRID) && !mentioned(text, name));
      expect(
        missing,
        `Add a story in packages/ui/stories/datagrid/ for: ${missing.join(", ")} (or list it in NOT_STORIED_DATAGRID with a reason)`,
      ).toEqual([]);
    });

    it("keeps NOT_STORIED_DATAGRID honest", () => {
      const text = storyText();
      const stale = Object.keys(NOT_STORIED_DATAGRID).filter((name) => !grid.includes(name) || mentioned(text, name));
      expect(stale, "remove these from NOT_STORIED_DATAGRID").toEqual([]);
    });
  });
});
