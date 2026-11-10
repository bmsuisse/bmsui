import type { ComponentType, SVGProps } from "react";

export interface CommandItem {
  /** Stable id; also what `recent` stores. */
  id: string;
  label: string;
  /** Section header the command is listed under. Sections appear in first-seen order (or `groupOrder`). */
  group?: string;
  /** Muted text after the label (a customer name, a file). */
  description?: string;
  /** Heroicon-style component. */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Shortcut hint shown on the right, e.g. `["⌘", "S"]` or `"G then O"`. Display only. */
  shortcut?: string | string[];
  /** Extra words the filter matches (synonyms, other languages). */
  keywords?: string[];
  /** `true` or a reason string ("Open an offer first"): shown greyed out and can't run. */
  disabled?: boolean | string;
  /** Runs the command. The palette closes first. */
  onSelect: () => unknown;
}
