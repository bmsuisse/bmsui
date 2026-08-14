import { describe, expect, it } from "vitest";
import { resolveMenuItems } from "../../src/menu/resolveMenuItems";
import type { MenuItem } from "../../src/menu/types";

interface Row {
  id: string;
  archived: boolean;
}

const row: Row = { id: "1", archived: false };
const archivedRow: Row = { id: "2", archived: true };

describe("resolveMenuItems", () => {
  it("includes items with no visible/disabled predicates, marked not disabled", () => {
    const items: MenuItem<Row>[] = [{ id: "edit", label: "Edit", onSelect: () => {} }];
    const resolved = resolveMenuItems(items, { row });
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.isDisabled).toBe(false);
  });

  it("drops items whose visible() returns false", () => {
    const items: MenuItem<Row>[] = [
      { id: "restore", label: "Restore", visible: (ctx) => ctx.row?.archived === true, onSelect: () => {} },
    ];
    expect(resolveMenuItems(items, { row })).toHaveLength(0);
    expect(resolveMenuItems(items, { row: archivedRow })).toHaveLength(1);
  });

  it("keeps items whose visible() returns true", () => {
    const items: MenuItem<Row>[] = [
      { id: "archive", label: "Archive", visible: (ctx) => ctx.row?.archived === false, onSelect: () => {} },
    ];
    expect(resolveMenuItems(items, { row })).toHaveLength(1);
  });

  it("marks (but doesn't drop) items whose disabled() returns true", () => {
    const items: MenuItem<Row>[] = [
      { id: "delete", label: "Delete", disabled: (ctx) => ctx.row?.archived === false, onSelect: () => {} },
    ];
    const resolved = resolveMenuItems(items, { row });
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.isDisabled).toBe(true);
  });

  it("evaluates against selectedRows for header-actions-style context", () => {
    const items: MenuItem<Row>[] = [
      {
        id: "bulk-archive",
        label: "Archive selected",
        disabled: (ctx) => (ctx.selectedRows?.length ?? 0) === 0,
        onSelect: () => {},
      },
    ];
    expect(resolveMenuItems(items, { selectedRows: [] })[0]?.isDisabled).toBe(true);
    expect(resolveMenuItems(items, { selectedRows: [row] })[0]?.isDisabled).toBe(false);
  });

  it("preserves item order and passes through label/danger/icon unchanged", () => {
    const items: MenuItem<Row>[] = [
      { id: "a", label: "A", onSelect: () => {} },
      { id: "b", label: "B", danger: true, onSelect: () => {} },
    ];
    const resolved = resolveMenuItems(items, { row });
    expect(resolved.map((i) => i.id)).toEqual(["a", "b"]);
    expect(resolved[1]?.danger).toBe(true);
  });

  it("evaluates every item's predicates independently (one hidden item doesn't affect others)", () => {
    const items: MenuItem<Row>[] = [
      { id: "hidden", label: "Hidden", visible: () => false, onSelect: () => {} },
      { id: "shown", label: "Shown", onSelect: () => {} },
    ];
    const resolved = resolveMenuItems(items, { row });
    expect(resolved.map((i) => i.id)).toEqual(["shown"]);
  });
});
