import { X } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";
import type { StatusTone } from "../status-badge/StatusBadge";

/** One offer a user can pick to fill the composer or trigger an action. */
export interface Suggestion {
  /** Stable identity, used as the React key and passed back through callbacks. */
  id: string;
  /** The chip's visible text. */
  label: string;
  /** Extra context shown under `label` in `layout="list"` only. */
  description?: string;
  /** Leading icon — a tile in `list`, an inline glyph in `row`/`wrap`. */
  icon?: ComponentType<{ className?: string }>;
  /** Reuses StatusBadge's tone vocabulary. */
  tone?: StatusTone;
  /** Disables this one chip regardless of the component-level `disabled` prop. */
  disabled?: boolean;
}

export interface SuggestionChipsProps extends HTMLAttributes<HTMLDivElement> {
  /** The offers to render, in order. */
  suggestions: Suggestion[];
  /** Fired with the picked suggestion when its chip (not its dismiss control) is activated. */
  onPick?: (s: Suggestion) => void;
  /**
   * `list`: vertical cards (an empty/welcome state).
   * `row`: one-line horizontal scroller with edge fades (follow-ups under a finished turn).
   * `wrap`: centred wrapping pills.
   * @default "wrap"
   */
  layout?: "list" | "row" | "wrap";
  /** Render-prop escape hatch so a headless runtime can own the click. Receives the built chip element. */
  renderChip?: (s: Suggestion, chip: ReactElement) => ReactNode;
  /** Disables every chip regardless of each suggestion's own `disabled`. */
  disabled?: boolean;
  /** Makes each chip dismissible (an `×`), e.g. a single contextual "ask about {customer}" pill. */
  onDismiss?: (s: Suggestion) => void;
}

/**
 * Tone -> class mapping for the small tint this component uses (an icon
 * tile in `list`, a dot/border tint in `wrap`/`row`). StatusBadge does not
 * currently export its `TONE_CLASSES` map, so these are a deliberate mirror
 * of that file's classes (same emerald/amber/sky/destructive/muted choices,
 * same light/dark pairing) rather than a new palette — if StatusBadge ever
 * exports its map, this should import it instead of hand-copying it again.
 */
const TONE_TILE_CLASSES: Record<StatusTone, string> = {
  success: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  info: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  error: "bg-destructive/15 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

/** A smaller dot-only version of the same mapping, for `wrap`/`row` chips. */
const TONE_DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-emerald-500 dark:bg-emerald-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  info: "bg-sky-500 dark:bg-sky-400",
  error: "bg-destructive",
  neutral: "bg-muted-foreground/50",
};

/**
 * `SuggestionChips` renders a set of "here's what you can ask" offers as
 * either a vertical card list, a single-line horizontal scroller, or
 * centred wrapping pills.
 *
 * **Why this exists.** A real chat product had accumulated five divergent
 * treatments of the exact same idea — a welcome card list, a sidebar hint
 * box, a bottom-sheet button list, ghost pills under an empty thread, and a
 * horizontal follow-up scroller under a finished turn — each with its own
 * markup, its own hover/disabled handling, and its own (usually missing)
 * accessible name. None of them disagreed on the underlying data shape (an
 * id, a label, maybe a description/icon/tone); they disagreed only on
 * layout. This component collapses that into one data model and three
 * `layout` values, so a future sixth surface is a `layout` choice, not a
 * sixth implementation.
 *
 * **Why `wrap`/`row` never use a primary fill.** These are offers, not the
 * current selection — a suggestion is not "active" the way a selected tab
 * or a chosen filter is; picking one usually starts a new turn rather than
 * toggling a persistent state. A solid primary-colored pill would visually
 * claim the "this is selected" role that the composer's actual content
 * should own once the user acts on it. Ghost pills with a `bg-muted/80`
 * hover keep the affordance ("clickable") without borrowing that meaning.
 *
 * **Why `role="group"` and not `role="list"`/`listitem`.** These are
 * interactive controls (buttons), not a passive list a screen reader should
 * enumerate item-by-item — `list`/`listitem` is the wrong semantic here
 * (it's built for static content), and Buttons already get their own
 * accessible name and tab stop. `role="group"` groups the buttons under one
 * optional `aria-label` (accepted via `...props`) without implying a
 * navigable list structure.
 *
 * **Why dismiss is a sibling button, never nested.** Nested
 * `<button>`-in-`<button>` is invalid HTML and unreliable for assistive
 * tech (activating the outer button's hit area can't cleanly exclude the
 * inner one). When `onDismiss` is supplied, the chip and its `×` render as
 * two sibling buttons inside one flex wrapper instead.
 *
 * **`row`'s edge fades are the fiddly part.** See the inline comments on
 * `useEdgeFade` below for the RTL-aware scroll-position math.
 *
 * **Not building here:** suggestion fetching/data-loading, per-route
 * suggestion catalogues (that's app/router concern), or any status-token
 * tint beyond reusing StatusBadge's existing tone vocabulary.
 */
export const SuggestionChips = forwardRef<HTMLDivElement, SuggestionChipsProps>(
  (
    { suggestions, onPick, layout = "wrap", renderChip, disabled = false, onDismiss, className, ...props },
    ref,
  ): ReactElement => {
    const rowRef = useRef<HTMLDivElement | null>(null);
    const edgeFade = useEdgeFade(rowRef, layout === "row");

    const renderOne = (s: Suggestion): ReactNode => {
      const isDisabled = disabled || s.disabled === true;
      const chip = (
        <Chip
          key={s.id}
          suggestion={s}
          layout={layout}
          disabled={isDisabled}
          onPick={onPick}
        />
      );

      const built = renderChip ? <span key={s.id}>{renderChip(s, chip)}</span> : chip;

      if (!onDismiss) {
        return built;
      }

      return (
        <div
          key={s.id}
          data-slot="suggestion-chip-wrapper"
          className={cn("flex items-center gap-1", layout === "row" && "shrink-0")}
        >
          {built}
          <button
            type="button"
            data-slot="suggestion-dismiss"
            aria-label={`Dismiss ${s.label}`}
            disabled={isDisabled}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors",
              "hover:bg-muted/80 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
            onClick={() => onDismiss(s)}
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      );
    };

    if (layout === "list") {
      return (
        <div
          ref={ref}
          role="group"
          data-slot="suggestion-chips"
          data-layout="list"
          className={cn("flex flex-col gap-2", className)}
          {...props}
        >
          {suggestions.map(renderOne)}
        </div>
      );
    }

    if (layout === "row") {
      return (
        <div
          ref={ref}
          role="group"
          data-slot="suggestion-chips"
          data-layout="row"
          className={cn("relative", className)}
          {...props}
        >
          <div
            ref={rowRef}
            data-slot="suggestion-chips-scroller"
            className="flex min-h-8 items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
            style={{ maskImage: edgeFade, WebkitMaskImage: edgeFade }}
          >
            {suggestions.map(renderOne)}
          </div>
        </div>
      );
    }

    // wrap
    return (
      <div
        ref={ref}
        role="group"
        data-slot="suggestion-chips"
        data-layout="wrap"
        className={cn("flex flex-wrap items-center justify-center gap-2", className)}
        {...props}
      >
        {suggestions.map(renderOne)}
      </div>
    );
  },
);

SuggestionChips.displayName = "SuggestionChips";

interface ChipProps {
  suggestion: Suggestion;
  layout: "list" | "row" | "wrap";
  disabled: boolean;
  onPick?: (s: Suggestion) => void;
}

function Chip({ suggestion, layout, disabled, onPick }: ChipProps): ReactElement {
  const { label, description, icon: Icon, tone } = suggestion;

  if (layout === "list") {
    return (
      <button
        type="button"
        data-slot="suggestion-chip"
        disabled={disabled}
        className={cn(
          "flex min-h-10 w-full items-center gap-3 rounded-xl border bg-muted px-3.5 py-2.5 text-left transition-colors md:min-h-8",
          "hover:bg-muted/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
        onClick={() => onPick?.(suggestion)}
      >
        {Icon && (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              tone ? TONE_TILE_CLASSES[tone] : "bg-background text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-foreground">{label}</span>
          {description && <span className="truncate text-xs text-muted-foreground">{description}</span>}
        </span>
      </button>
    );
  }

  // row / wrap: ghost pill, optionally with a leading icon and/or tone dot.
  return (
    <button
      type="button"
      data-slot="suggestion-chip"
      disabled={disabled}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-sm transition-colors md:min-h-8",
        "hover:bg-muted/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
      onClick={() => onPick?.(suggestion)}
    >
      {tone && <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT_CLASSES[tone])} />}
      {Icon && <Icon aria-hidden="true" className="size-3.5 shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

/**
 * Drives the `row` layout's edge-fade masks.
 *
 * This is the fiddliest part of the component. We need to know, at any
 * scroll position, whether there is more content hidden off the *start*
 * edge and/or the *end* edge, and fade only those edges — a `row` that
 * exactly fits its content should show no fade at all.
 *
 * Two complications drive the implementation:
 *
 * 1. **RTL.** In a right-to-left scroller, `scrollLeft` can be zero,
 *    positive, or negative at the "start" depending on the browser engine,
 *    and increases toward the *visual* end differently than in LTR. Rather
 *    than special-case each browser's convention, we read
 *    `getComputedStyle(el).direction` once per measurement and derive
 *    `canScrollStart`/`canScrollEnd` (which map to the *visual* left/right
 *    mask stops) from the sign and magnitude of `scrollLeft` relative to
 *    `scrollWidth - clientWidth`, flipping the interpretation for `rtl`.
 * 2. **When to re-measure.** Content width can change without a scroll
 *    event (suggestions prop changes, a container resize, fonts loading),
 *    so a plain `scroll` listener isn't enough — we also attach a
 *    `ResizeObserver` to the scroller element. `ResizeObserver` doesn't
 *    exist in some SSR/older-jsdom environments, so its construction is
 *    guarded; without it we still measure once on mount/suggestion change
 *    via the `scroll` listener path, we just don't react to pure resizes.
 */
function useEdgeFade(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean): string | undefined {
  const [mask, setMask] = useState<string | undefined>(undefined);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const { scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;

    if (maxScroll <= 1) {
      setMask(undefined);
      return;
    }

    const isRtl = getComputedStyle(el).direction === "rtl";
    const scrollLeft = el.scrollLeft;

    // Normalize to "distance scrolled from the visual start" regardless of
    // the browser's RTL scrollLeft convention (0/positive/negative-growing).
    const distanceFromStart = isRtl ? maxScroll - Math.abs(scrollLeft) : scrollLeft;
    const canScrollStart = distanceFromStart > 1;
    const canScrollEnd = distanceFromStart < maxScroll - 1;

    const FADE = "20px";
    const stops: string[] = [];
    stops.push(canScrollStart ? `transparent, black ${FADE}` : "black 0");
    stops.push(canScrollEnd ? `black calc(100% - ${FADE}), transparent 100%` : "black 100%");
    setMask(`linear-gradient(to right, ${stops.join(", ")})`);
  }, [ref]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const el = ref.current;
    if (!el) {
      return;
    }

    measure();
    el.addEventListener("scroll", measure, { passive: true });

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => measure());
      observer.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [enabled, measure, ref]);

  return enabled ? mask : undefined;
}
