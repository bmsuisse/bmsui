/** Minimal shape shared by `ComboboxOption` and `TagComboboxOption` — everything
 * the grouping helpers below actually touch. Both components keep their own,
 * richer option type; this exists purely so the two don't hand-duplicate the
 * same grouping logic (and risk it drifting between them on a future fix). */
export interface GroupableOption {
  value: string;
  group?: string;
  disabled?: boolean;
}

export function groupMembers<T extends GroupableOption>(options: T[], group: string): string[] {
  return options.filter((o) => o.group === group && !o.disabled).map((o) => o.value);
}

export type GroupCheckState = "checked" | "unchecked" | "indeterminate";

export function groupCheckState<T extends GroupableOption>(
  options: T[],
  selectedValues: string[],
  group: string,
): GroupCheckState {
  const members = groupMembers(options, group);
  const selectedCount = members.filter((v) => selectedValues.includes(v)).length;
  if (selectedCount === 0) return "unchecked";
  return selectedCount === members.length ? "checked" : "indeterminate";
}

export interface OptionRow<T extends GroupableOption> {
  option: T;
  index: number;
}
export interface GroupChunk<T extends GroupableOption> {
  kind: "group";
  group: string;
  rows: OptionRow<T>[];
}
export interface SingleChunk<T extends GroupableOption> {
  kind: "single";
  row: OptionRow<T>;
}
export type RenderChunk<T extends GroupableOption> = GroupChunk<T> | SingleChunk<T>;

/** Chunks `visibleOptions` into per-group chunks (a header plus all of that group's
 * rows, relying on the "a group's options are contiguous" invariant `group` already
 * documents on both option types) versus lone ungrouped rows, in one linear pass --
 * kept separate from JSX so a caller's render is a plain `.map()` with no per-row
 * bookkeeping of its own. A sticky header can only stay pinned within its own
 * containing block -- the nearest ancestor that isn't itself sticky/statically laid
 * out -- so the header and every one of its group's rows must share one wrapper
 * element. Rendering each row in its own top-level sibling div (rather than chunking
 * by group) gave the header a containing block of just itself plus the group's first
 * row, so it unstuck after a single row instead of staying pinned for the group's
 * full scroll extent. */
export function buildRenderChunks<T extends GroupableOption>(visibleOptions: T[]): RenderChunk<T>[] {
  const chunks: RenderChunk<T>[] = [];
  visibleOptions.forEach((option, index) => {
    const row: OptionRow<T> = { option, index };
    const last = chunks[chunks.length - 1];
    if (option.group && last?.kind === "group" && last.group === option.group) {
      last.rows.push(row);
    } else if (option.group) {
      chunks.push({ kind: "group", group: option.group, rows: [row] });
    } else {
      chunks.push({ kind: "single", row });
    }
  });
  return chunks;
}
