import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import type { HTMLAttributes, KeyboardEvent, ReactElement } from "react";
import { useRef, useState } from "react";
import { cn } from "../../lib/utils";

export interface RatingLabels {
  /** Accessible name of the group when no `aria-label`/`aria-labelledby` is given. */
  rating: string;
  /** Name of one choice: `3 of 5 stars`, `3.5 of 5 stars`. */
  star: (value: number, max: number) => string;
  /** Text read for a `readOnly` rating: `3.5 out of 5`. */
  valueText: (value: number, max: number) => string;
  /** Text read for a `readOnly` rating with no value. */
  unrated: string;
}

export const defaultRatingLabels: RatingLabels = {
  rating: "Rating",
  star: (value, max) => `${value} of ${max} ${max === 1 ? "star" : "stars"}`,
  valueText: (value, max) => `${value} out of ${max}`,
  unrated: "Not rated",
};

export interface RatingProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Current rating, `0` = none. Half steps (`3.5`) need `allowHalf`. Omit with `defaultValue` for an uncontrolled field. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Number of stars. @default 5 */
  max?: number;
  /** Show only: no focus, no hover, a single `role="img"` with the value as its name. `disabled` looks the same, dimmed. */
  readOnly?: boolean;
  disabled?: boolean;
  /** Choose in half stars (a star's left half is `n - 0.5`). Also renders half stars in `readOnly`. */
  allowHalf?: boolean;
  /** Clicking the current value, or Backspace/Delete, clears the rating to `0`. @default false */
  allowClear?: boolean;
  /** `sm` 16 px, `md` 20 px, `lg` 28 px stars. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Form field name for a hidden input carrying the value. */
  name?: string;
  labels?: Partial<RatingLabels>;
}

const ICON: Record<NonNullable<RatingProps["size"]>, string> = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" };

/** Float-safe rounding to the half star, so `0.1 + 0.2` style sums never leak out. */
const round = (n: number): number => Math.round(n * 2) / 2;

/**
 * Star rating as a radiogroup: one tab stop, ArrowLeft/Right/Up/Down move and select (Home
 * = lowest, End = `max`), hovering previews the value before it is chosen. `allowHalf`
 * splits each star in two choices; `readOnly` turns it into a plain `role="img"` display
 * (average ratings, with half stars). Filled stars are solid and empty ones outlined, so the
 * value does not rest on colour alone. Controlled (`value`/`onValueChange`) or uncontrolled.
 */
export function Rating({
  value,
  defaultValue = 0,
  onValueChange,
  max = 5,
  readOnly = false,
  disabled = false,
  allowHalf = false,
  allowClear = false,
  size = "md",
  name,
  labels,
  className,
  onKeyDown,
  onMouseLeave,
  ...props
}: RatingProps): ReactElement {
  const l = { ...defaultRatingLabels, ...labels };
  const [inner, setInner] = useState(defaultValue);
  const current = Math.min(max, Math.max(0, round(value ?? inner)));
  const [hover, setHover] = useState<number | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const step = allowHalf ? 0.5 : 1;
  const shown = readOnly || disabled ? current : (hover ?? current);
  const interactive = !readOnly && !disabled;

  const choose = (next: number, focus = false) => {
    if (next === current) return;
    if (value === undefined) setInner(next);
    onValueChange?.(next);
    if (focus) {
      groupRef.current?.querySelector<HTMLElement>(`[data-rating-value="${next}"]`)?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || !interactive) return;
    const lowest = allowClear ? 0 : step;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(max, (current || 0) + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(lowest, (current || lowest + step) - step);
    else if (e.key === "Home") next = lowest;
    else if (e.key === "End") next = max;
    else if (allowClear && (e.key === "Backspace" || e.key === "Delete")) next = 0;
    if (next == null) return;
    e.preventDefault();
    choose(next, next > 0);
  };

  const stars: ReactElement[] = [];
  // One tab stop: the chosen value, or the first choice while nothing is chosen.
  const tabValue = current > 0 ? current : step;
  for (let star = 1; star <= max; star++) {
    const fill = Math.min(1, Math.max(0, shown - (star - 1)));
    const choices = allowHalf ? [star - 0.5, star] : [star];
    stars.push(
      <span
        key={star}
        data-testid={`rating-star-${star}`}
        className={cn(
          "relative inline-flex shrink-0 text-muted-foreground transition-transform duration-150 ease-out",
          interactive && "p-0.5 pointer-coarse:p-1.5",
          interactive && hover != null && star === Math.ceil(hover) && "scale-110 motion-reduce:scale-100",
          "has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring has-[button:focus-visible]:ring-offset-1 has-[button:focus-visible]:ring-offset-background rounded-sm",
        )}
      >
        <StarOutline aria-hidden="true" className={ICON[size]} />
        <span
          aria-hidden="true"
          data-testid={`rating-fill-${star}`}
          className={cn("pointer-events-none absolute overflow-hidden text-amber-600 dark:text-amber-400", interactive ? "left-0.5 top-0.5 pointer-coarse:left-1.5 pointer-coarse:top-1.5" : "left-0 top-0")}
          style={{ width: `${fill * 100}%` }}
        >
          <StarSolid className={cn(ICON[size], "max-w-none")} />
        </span>
        {interactive
          ? choices.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={v === current}
                aria-label={l.star(v, max)}
                data-rating-value={v}
                tabIndex={v === tabValue ? 0 : -1}
                className={cn(
                  "absolute inset-y-0 cursor-pointer focus-visible:outline-none",
                  allowHalf ? (v % 1 === 0 ? "right-0 w-1/2" : "left-0 w-1/2") : "inset-x-0",
                )}
                onMouseEnter={() => setHover(v)}
                onFocus={() => setHover(null)}
                onClick={() => choose(allowClear && v === current ? 0 : v)}
              />
            ))
          : null}
      </span>,
    );
  }

  const label = props["aria-label"] ?? (props["aria-labelledby"] ? undefined : l.rating);

  if (!interactive) {
    return (
      <div
        {...props}
        role="img"
        aria-label={`${label ? `${label}: ` : ""}${current > 0 ? l.valueText(current, max) : l.unrated}`}
        aria-disabled={disabled || undefined}
        className={cn("inline-flex items-center", disabled && "opacity-50", className)}
      >
        {stars}
        {name ? <input type="hidden" name={name} value={current} /> : null}
      </div>
    );
  }

  return (
    <div
      ref={groupRef}
      {...props}
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      onMouseLeave={(e) => {
        setHover(null);
        onMouseLeave?.(e);
      }}
      className={cn("inline-flex items-center", className)}
    >
      {stars}
      {name ? <input type="hidden" name={name} value={current} /> : null}
    </div>
  );
}
