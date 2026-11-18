import { type HTMLAttributes, type ReactElement, useEffect, useRef } from "react";
import { EASE_OUT, animate, prefersReducedMotion } from "../../lib/motion";
import { cn } from "../../lib/utils";
import { getI18n, useLabels } from "../../i18n/locale";
import type { IntegratedI18n } from "../../i18n/locale";

export interface TypingIndicatorLabels {
  /** Spoken (and, with `showLabel`, shown) text. */
  typing: string;
}
export const typingIndicatorLabelsFor = ({ t }: IntegratedI18n): TypingIndicatorLabels => ({
  typing: t("typingIndicator.typing"),
});

export const defaultTypingIndicatorLabels: TypingIndicatorLabels = typingIndicatorLabelsFor(getI18n("en", false));

export interface TypingIndicatorProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Spoken (and, with `showLabel`, shown) text; overrides `labels.typing`. @default "Assistant is typing" */
  label?: string;
  labels?: Partial<TypingIndicatorLabels>;
  /** Show the label next to the dots. @default false */
  showLabel?: boolean;
  /** @default "md" */
  size?: "sm" | "md";
  /** Bounce the dots. Off (or under reduced motion) they sit still. @default true */
  animated?: boolean;
}

/**
 * Three dots for "the assistant is typing / thinking" before the first token of a reply.
 * Staggered Web Animations (rise + fade, ~1.2 s loop); static under reduced motion.
 */
export const TypingIndicator = ({
  label,
  labels,
  showLabel = false,
  size = "md",
  animated = true,
  className,
  ...props
}: TypingIndicatorProps): ReactElement => {
  const root = useRef<HTMLSpanElement>(null);
  const text = useLabels(typingIndicatorLabelsFor, labels);
  useEffect(() => {
    if (!animated || prefersReducedMotion()) return;
    const dots = Array.from(root.current?.querySelectorAll("[data-dot]") ?? []);
    const anims = dots.map((dot, i) =>
      animate(
        dot,
        [
          { transform: "translateY(0)", opacity: 0.5 },
          { transform: "translateY(-25%)", opacity: 1, offset: 0.3 },
          { transform: "translateY(0)", opacity: 0.5, offset: 0.6 },
          { transform: "translateY(0)", opacity: 0.5 },
        ],
        { duration: 1200, delay: i * 160, iterations: Infinity, easing: EASE_OUT },
      ),
    );
    return () => anims.forEach((a) => a?.cancel());
  }, [animated]);
  const dot = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  return (
    <span
      ref={root}
      role="status"
      data-slot="typing-indicator"
      className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}
      {...props}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} data-dot className={cn("rounded-full bg-muted-foreground opacity-70", dot)} />
        ))}
      </span>
      <span className={cn(!showLabel && "sr-only")}>{label ?? text.typing}</span>
    </span>
  );
};
