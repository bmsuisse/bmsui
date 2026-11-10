import { Fragment, type HTMLAttributes, type ReactElement } from "react";
import { isMacPlatform } from "../../lib/platform";
import { useIsMac } from "../../lib/useHydrated";
import { cn } from "../../lib/utils";

const MAC_KEYS: Record<string, string> = {
  Mod: "⌘",
  Meta: "⌘",
  Cmd: "⌘",
  Ctrl: "⌃",
  Control: "⌃",
  Alt: "⌥",
  Option: "⌥",
  Shift: "⇧",
};
const OTHER_KEYS: Record<string, string> = { Mod: "Ctrl", Meta: "Win", Cmd: "Ctrl", Control: "Ctrl", Option: "Alt" };
const COMMON_KEYS: Record<string, string> = {
  Enter: "↵",
  Return: "↵",
  Escape: "Esc",
  Esc: "Esc",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Up: "↑",
  Down: "↓",
  Left: "←",
  Right: "→",
  Backspace: "⌫",
  Delete: "Del",
  Tab: "Tab",
  Space: "Space",
  Plus: "+",
};

/**
 * One key name as the user's keyboard calls it: `Mod` → ⌘ on Apple, Ctrl
 * elsewhere; `Shift`/`Alt` → ⇧/⌥ on Apple; arrows → ↑↓←→; single letters upper-cased.
 */
export function formatKey(key: string, mac: boolean = isMacPlatform()): string {
  const platform = mac ? MAC_KEYS[key] : OTHER_KEYS[key];
  if (platform) return platform;
  if (COMMON_KEYS[key]) return COMMON_KEYS[key];
  return key.length === 1 ? key.toUpperCase() : key;
}

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /** `sm` for menus and tight rows, `md` (default) for running text and sheets. */
  size?: "sm" | "md";
}

/**
 * A single keycap (`<kbd>`). Use `KeyCombo` for a whole shortcut — it splits
 * "Mod+K" into caps and spells them per platform.
 */
export const Kbd = ({ size = "md", className, ...props }: KbdProps): ReactElement => (
  <kbd
    data-testid="kbd"
    className={cn(
      "inline-flex items-center justify-center rounded border border-foreground/15 border-b-foreground/25 bg-muted font-sans font-medium leading-none text-muted-foreground dark:bg-foreground/10 dark:text-foreground/80",
      size === "sm" ? "h-4 min-w-4 px-1 pt-px text-[10px]" : "h-5 min-w-5 px-1.5 pt-px text-[11px]",
      className,
    )}
    {...props}
  />
);

export interface KeyComboLabels {
  /** Between the steps of a sequence ("g then o"). */
  then: string;
  /** Between alternative shortcuts. */
  or: string;
}

export const defaultKeyComboLabels: KeyComboLabels = { then: "then", or: "or" };

export interface KeyComboProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * One shortcut or several alternatives. `+` joins keys pressed together
   * ("Mod+Shift+K"), a space separates a sequence ("g o" = g, then o). Use
   * `Mod` for the platform's command key, `Plus` for a literal "+".
   */
  keys: string | string[];
  /** Force Apple (⌘) or PC (Ctrl) spelling; detected from the browser after hydration by default (PC spelling on the server). */
  mac?: boolean;
  size?: KbdProps["size"];
  labels?: Partial<KeyComboLabels>;
}

/**
 * A keyboard shortcut as keycaps: `Mod+K` renders "⌘ K" on a Mac and "Ctrl K"
 * elsewhere. Use it in menus, tooltips, buttons and the `ShortcutSheet`.
 */
export const KeyCombo = ({ keys, mac, size, labels, className, ...props }: KeyComboProps): ReactElement => {
  // Detected after hydration (server renders the PC spelling); an explicit `mac` wins.
  const detectedMac = useIsMac();
  const isMac = mac ?? detectedMac;
  const l = { ...defaultKeyComboLabels, ...labels };
  const alternatives = Array.isArray(keys) ? keys : [keys];
  return (
    <span
      data-testid="key-combo"
      className={cn("inline-flex shrink-0 flex-wrap items-center gap-1 align-middle", className)}
      {...props}
    >
      {alternatives.map((combo, a) => (
        <Fragment key={combo}>
          {a > 0 ? <span className="text-[11px] text-muted-foreground">{l.or}</span> : null}
          {combo
            .trim()
            .split(/\s+/)
            .map((step, s, steps) => (
              <Fragment key={steps.slice(0, s + 1).join(" ")}>
                {s > 0 ? <span className="text-[11px] text-muted-foreground">{l.then}</span> : null}
                <span className="inline-flex items-center gap-0.5">
                  {step.split("+").map((key, k) => (
                    <Kbd key={`${k}-${key}`} size={size}>
                      {formatKey(key, isMac)}
                    </Kbd>
                  ))}
                </span>
              </Fragment>
            ))}
        </Fragment>
      ))}
    </span>
  );
};
