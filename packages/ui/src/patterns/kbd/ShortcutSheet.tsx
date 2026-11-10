import type { ReactElement, ReactNode } from "react";
import { useId } from "react";
import { cn } from "../../lib/utils";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import { KeyCombo, type KeyComboLabels } from "./Kbd";

export interface Shortcut {
  /** Stable key; defaults to the joined keys. */
  id?: string;
  /** What the shortcut does. */
  label: ReactNode;
  /** One or more alternative combos, same syntax as `KeyCombo` ("Mod+K", "g o"). */
  keys: string | string[];
}

export interface ShortcutGroup {
  /** Where the shortcuts work ("General", "In the editor"). */
  title: string;
  /** One line under the title, e.g. "Not while typing in a field". */
  hint?: ReactNode;
  items: Shortcut[];
}

export interface ShortcutSheetLabels extends KeyComboLabels {
  title: string;
  description: string;
}

export const defaultShortcutSheetLabels: ShortcutSheetLabels = {
  title: "Keyboard shortcuts",
  description: "Shortcuts don't fire while you type in a field.",
  then: "then",
  or: "or",
};

export interface ShortcutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ShortcutGroup[];
  /** Extra content above the groups (a link to keyboard settings, a search field). */
  children?: ReactNode;
  /** Force Apple/PC key spelling; detected by default. */
  mac?: boolean;
  labels?: Partial<ShortcutSheetLabels>;
  className?: string;
}

/**
 * The "?" dialog: every keyboard shortcut of the app in one place, grouped by
 * where it works. The app owns the open state and the key listener that opens
 * it; feed it the same list the handlers are built from so it can't drift.
 */
export const ShortcutSheet = ({
  open,
  onOpenChange,
  groups,
  children,
  mac,
  labels,
  className,
}: ShortcutSheetProps): ReactElement => {
  const l = { ...defaultShortcutSheetLabels, ...labels };
  const baseId = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="shortcut-sheet" className={cn("sm:max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>{l.title}</DialogTitle>
          <DialogDescription>{l.description}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          {children}
          {groups.map((group, g) => {
            const headingId = `${baseId}-g${g}`;
            return (
              <section key={group.title} aria-labelledby={headingId}>
                <h3 id={headingId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </h3>
                {group.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{group.hint}</p> : null}
                <ul className="mt-2 divide-y divide-foreground/10 rounded-md border border-foreground/10">
                  {group.items.map((item) => {
                    const keys = Array.isArray(item.keys) ? item.keys : [item.keys];
                    return (
                      <li
                        key={item.id ?? keys.join("|")}
                        data-testid="shortcut-row"
                        className="flex items-center justify-between gap-4 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0">{item.label}</span>
                        <KeyCombo keys={keys} mac={mac} labels={{ then: l.then, or: l.or }} className="justify-end" />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
