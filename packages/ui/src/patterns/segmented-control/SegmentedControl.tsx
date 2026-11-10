import type { ComponentType, KeyboardEvent, ReactElement } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

/** One segment of a {@link SegmentedControl}. */
export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** `sm` = h-8 like `Button size="sm"`. @default "default" (h-9) */
  size?: "sm" | "default";
  /** Stretch to the parent's width with equal segments. */
  fullWidth?: boolean;
  disabled?: boolean;
  /** Accessible name of the radiogroup. */
  "aria-label"?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Compact single choice between 2–5 views or modes (List / Board, Month /
 * Year): a muted track with a thumb that slides under the active segment.
 * Radiogroup semantics — one tab stop, arrow keys move and select. Use
 * `ButtonGroup` for a row of connected *action-like* choices with outline
 * styling, `Tabs` when the segments switch whole panels, `RadioList` for
 * choices that need descriptions.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onValueChange,
  size = "default",
  fullWidth = false,
  disabled = false,
  className,
  ...props
}: SegmentedControlProps<T>): ReactElement {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  const testId = props["data-testid"];

  const measure = useCallback(() => {
    const active = trackRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]');
    setThumb(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, value, options, size]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  const enabled = options.filter((o) => !o.disabled && !disabled);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next: SegmentedControlOption<T> | undefined;
    if (step) {
      const at = enabled.findIndex((o) => o.value === value);
      // No enabled option is checked yet: forward starts at the first, backward at the last.
      if (at < 0) next = step > 0 ? enabled[0] : enabled[enabled.length - 1];
      else next = enabled[(at + step + enabled.length) % enabled.length];
    } else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    e.preventDefault();
    onValueChange(next.value);
    const target = next.value;
    Array.from(trackRef.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])
      .find((el) => el.dataset.value === target)
      ?.focus();
  };

  const sm = size === "sm";
  const hasChecked = options.some((o) => o.value === value);

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={props["aria-label"]}
      aria-disabled={disabled || undefined}
      data-testid={testId ?? "segmented-control"}
      onKeyDown={onKeyDown}
      className={cn(
        "relative isolate items-center rounded-md bg-muted-foreground/10 p-0.5",
        fullWidth ? "flex w-full" : "inline-flex w-fit",
        sm ? "h-8" : "h-9",
        disabled && "opacity-50",
        className,
      )}
    >
      {thumb ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0.5 left-0 -z-10 rounded-[calc(var(--radius-md,0.375rem)-2px)] bg-background shadow-sm ring-1 ring-black/5 transition-[transform,width] duration-200 ease-out motion-reduce:transition-none dark:bg-muted-foreground/25 dark:ring-white/10"
          style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
        />
      ) : null}
      {options.map((option, index) => {
        const checked = option.value === value;
        const Icon = option.icon;
        const optionDisabled = disabled || option.disabled;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            data-value={option.value}
            data-state={checked ? "checked" : "unchecked"}
            disabled={optionDisabled}
            tabIndex={checked || (!hasChecked && index === 0) ? 0 : -1}
            data-testid={testId ? `${testId}-option-${option.value}` : undefined}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[calc(var(--radius-md,0.375rem)-2px)] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              sm ? "px-2.5 text-xs [&_svg]:size-3.5" : "px-3 text-sm [&_svg]:size-4",
              fullWidth && "flex-1",
              checked ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon ? <Icon aria-hidden="true" className="shrink-0" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
