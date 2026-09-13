import { Sparkles } from "lucide-react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

export interface AiMarkerProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** @default "AI" */
  label?: string;
  /** The "AI is thinking" state. */
  pulse?: boolean;
  /**
   * `chip` sits on its own (a card corner, a list-item trailing slot);
   * `inline` drops the background so the glyph can sit mid-sentence, e.g.
   * "Summary ✦AI generated" inside a paragraph.
   * @default "chip"
   */
  variant?: "chip" | "inline";
  /** @default "sm" */
  size?: "xs" | "sm";
}

// `gap` is separate from `chip` because both variants need it: `inline` has no
// chip classes at all, and folding the gap in there left the sparkle and the
// label touching whenever variant="inline".
const SIZE_CLASSES: Record<
  NonNullable<AiMarkerProps["size"]>,
  { icon: string; text: string; gap: string; chip: string }
> = {
  xs: { icon: "size-2.5", text: "text-[9px]", gap: "gap-0.5", chip: "h-4 px-1.5" },
  sm: { icon: "size-3", text: "text-[10px]", gap: "gap-1", chip: "h-5 px-1.5" },
};

/**
 * The shared atom every AI-touched surface (a parsed field, a generated
 * summary, a suggested match) uses to say "this came from a model, not a
 * human" — provenance, not a status. It intentionally does one thing: a
 * sparkle glyph in the dedicated `--ai` hue plus an optional label, because
 * three consuming-app screens had each invented their own version of this
 * (a purple dot, a "beta" pill, a robot emoji) and none of them agreed on
 * color, so nothing in the product actually read as "AI" at a glance.
 *
 * Color: uses the arbitrary-value-with-fallback form (`[var(--ai,#6366f1)]`)
 * rather than a `bg-ai`/`text-ai` Tailwind utility. This package ships no
 * CSS, so a Tailwind token class only resolves when the consuming app has
 * registered `--color-ai` in its own `@theme inline` block (see the "AI
 * token" docs) — the arbitrary-value form works everywhere, token or not,
 * at the cost of the class being unreadable as a semantic name in devtools.
 * That tradeoff is worth it for a component every consumer drops in without
 * necessarily having wired the token yet.
 *
 * `pulse` is the one animation this component owns: a slow (1.6s) opacity/
 * scale breathe standing in for "the model is working on this right now" —
 * deliberately not a spinner, since a spinner reads as "loading a fixed
 * thing" while this is closer to "thinking". It is disabled outright under
 * `prefers-reduced-motion`, at which point the marker simply sits static.
 *
 * Scope note: there is no "AiThinking" component with rotating phrases or a
 * step list bundled here — that is chat-surface territory with its own
 * lifecycle (streaming tokens, cancellation) that doesn't belong in a shared
 * atom. A plain wait uses the existing `LoadingSpinner`; only the "AI is
 * the one doing this wait" framing belongs to `AiMarker`.
 */
export const AiMarker = ({
  label = "AI",
  pulse = false,
  variant = "chip",
  size = "sm",
  className,
  ...props
}: AiMarkerProps): ReactElement => {
  const s = SIZE_CLASSES[size];

  return (
    <span
      role={pulse ? "status" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold tracking-[0.08em] uppercase",
        "text-[var(--ai,#6366f1)]",
        s.gap,
        variant === "chip" && cn("rounded-full bg-[var(--ai,#6366f1)]/10", s.chip),
        pulse && "motion-safe:animate-[ai-marker-pulse_1.6s_ease-in-out_infinite]",
        s.text,
        className,
      )}
      {...props}
    >
      <Sparkles aria-hidden="true" className={s.icon} />
      {label && <span>{label}</span>}
      {pulse && (
        <style>{`
          @keyframes ai-marker-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.55; transform: scale(0.92); }
          }
        `}</style>
      )}
    </span>
  );
};
