import { XMarkIcon } from "@heroicons/react/16/solid";
import { type HTMLAttributes, type KeyboardEvent, type ReactNode, forwardRef } from "react";
import type { Ref } from "react";
import { cn } from "../../lib/utils";
import { getI18n, useLabels, useIntegratedI18n } from "../../i18n/locale";
import type { IntegratedI18n } from "../../i18n/locale";

export type ChipSize = "sm" | "md";
export type ChipTone = "neutral" | "primary";

export interface ChipLabels {
  /** Accessible name of the remove (x) button; the chip's own text is appended. */
  remove: string;
  /** Accessible name of the remove button for a chip with text; default `"{remove} {text}"`. Use it when the word order differs. */
  removeItem?: (text: string) => string;
}

export const chipLabelsFor = ({ t }: IntegratedI18n): ChipLabels => ({
  remove: t("chip.remove"),
});

export const defaultChipLabels: ChipLabels = chipLabelsFor(getI18n("en", false));

export interface ChipClassOptions {
  selected?: boolean;
  dashed?: boolean;
  size?: ChipSize;
  tone?: ChipTone;
  interactive?: boolean;
  className?: string;
}

const SIZE: Record<ChipSize, string> = {
  sm: "h-5 gap-1 px-2 text-[11px] pointer-coarse:min-h-8",
  md: "h-8 gap-1.5 px-3 text-xs pointer-coarse:min-h-10",
};

/** Class list of a chip, for rendering a chip-looking element of your own (a router `Link`, a `<label>`). */
export function chipClass({
  selected = false,
  dashed = false,
  size = "md",
  tone = "neutral",
  interactive = false,
  className,
}: ChipClassOptions = {}): string {
  const on = selected || tone === "primary";
  return cn(
    "inline-flex min-w-0 max-w-full shrink-0 items-center whitespace-nowrap rounded-[var(--radius-pill,9999px)] border font-medium outline-none transition-[color,background-color,border-color,scale] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none",
    SIZE[size],
    dashed && "border-dashed",
    on
      ? "border-primary/30 bg-primary/10 text-primary dark:border-ring/40 dark:bg-ring/15 dark:text-ring"
      : "border-foreground/10 bg-muted text-muted-foreground dark:border-border",
    interactive &&
      cn(
        "cursor-pointer active:scale-[0.97] motion-reduce:active:scale-100",
        on ? "hover:bg-primary/15 dark:hover:bg-ring/25" : "hover:bg-foreground/6 hover:text-foreground",
      ),
    className,
  );
}

export interface ChipProps extends Omit<HTMLAttributes<HTMLElement>, "onClick" | "children"> {
  children: ReactNode;
  /** Filled primary look; on an interactive chip this is the pressed state (`aria-pressed`). */
  selected?: boolean;
  /** Dashed border, for "add" or optional values. */
  dashed?: boolean;
  /** `md` (default, 32px) or `sm` (20px, for tables and metadata rows). */
  size?: ChipSize;
  /** `primary` renders like `selected` without implying a toggle state. */
  tone?: ChipTone;
  /** Leading icon (decorative). */
  icon?: ReactNode;
  /** Makes the chip a toggle button with `aria-pressed={selected}`. */
  onClick?: () => void;
  /** Shows a x button; Backspace/Delete on the focused chip removes it too. */
  onRemove?: () => void;
  /** Overrides `labels.remove`. */
  removeLabel?: string;
  labels?: Partial<ChipLabels>;
  disabled?: boolean;
  "data-testid"?: string;
}

/**
 * A pill for a value, a filter or a choice. Static by default (an axis value,
 * a brand, a context tag); with `onClick` it is a toggle button
 * (`aria-pressed`); with `onRemove` it carries a x (an active filter).
 * Unlike `Badge`/`StatusBadge` it can be pressed and removed, and its text is
 * data the user picked, not a status.
 */
export const Chip = forwardRef<HTMLElement, ChipProps>(
  (
    {
      children,
      selected = false,
      dashed,
      size = "md",
      tone = "neutral",
      icon,
      onClick,
      onRemove,
      removeLabel,
      labels,
      disabled = false,
      className,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const l = useLabels(chipLabelsFor, labels);
    const { t } = useIntegratedI18n();
    // Not part of the built-in labels: a caller who spreads `defaultChipLabels` and rewords only `remove` keeps "<remove> <text>".
    const removeItem = labels?.removeItem ?? (labels?.remove === undefined ? (text: string) => t("chip.removeItem", { text }) : undefined);
    const iconSize = size === "sm" ? "[&_svg]:size-3" : "[&_svg]:size-3.5";
    const content = (
      <>
        {icon ? (
          <span aria-hidden="true" className={cn("inline-flex shrink-0", iconSize)}>
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 truncate">{children}</span>
      </>
    );

    if (onRemove) {
      const text = typeof children === "string" ? children : "";
      const handleKey = (event: KeyboardEvent<HTMLElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || disabled || event.target !== event.currentTarget) return;
        if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          onRemove();
        }
      };
      return (
        <span
          ref={ref as Ref<HTMLSpanElement>}
          tabIndex={disabled ? undefined : 0}
          onKeyDown={handleKey}
          aria-disabled={disabled || undefined}
          className={chipClass({
            selected,
            dashed,
            size,
            tone,
            className: cn(size === "sm" ? "pr-1" : "pr-1.5", disabled && "opacity-50", className),
          })}
          {...props}
        >
          {content}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label={removeLabel ?? (text ? (removeItem ? removeItem(text) : `${l.remove} ${text}`) : l.remove)}
            onClick={onRemove}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-pill,9999px)] outline-none transition-[background-color,scale] hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100",
              size === "sm" ? "size-4" : "size-5 pointer-coarse:size-7",
            )}
          >
            <XMarkIcon aria-hidden="true" className={size === "sm" ? "size-3" : "size-3.5"} />
          </button>
        </span>
      );
    }

    if (onClick) {
      return (
        <button
          ref={ref as Ref<HTMLButtonElement>}
          type="button"
          aria-pressed={selected}
          disabled={disabled}
          onClick={onClick}
          onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLButtonElement>}
          className={chipClass({
            selected,
            dashed,
            size,
            tone,
            interactive: true,
            className: cn(disabled && "pointer-events-none opacity-50", className),
          })}
          {...(props as HTMLAttributes<HTMLButtonElement>)}
        >
          {content}
        </button>
      );
    }

    return (
      <span ref={ref as Ref<HTMLSpanElement>} className={chipClass({ selected, dashed, size, tone, className })} {...props}>
        {content}
      </span>
    );
  },
);
Chip.displayName = "Chip";
