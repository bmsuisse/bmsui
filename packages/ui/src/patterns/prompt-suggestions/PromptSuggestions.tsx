import { type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import { useScrollOverflow } from "../../hooks/useScrollOverflow";
import { cn } from "../../lib/utils";

export interface PromptSuggestion {
  id: string;
  /** Text on the chip. */
  label: ReactNode;
  /** What `onSelect` receives when it differs from the label. Defaults to `label` when that is a string. */
  prompt?: string;
}

export interface PromptSuggestionsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Plain strings (id = text) or `{ id, label, prompt? }`. */
  suggestions: ReadonlyArray<string | PromptSuggestion>;
  /** Receives the prompt text and the normalized item. */
  onSelect?: (prompt: string, suggestion: PromptSuggestion) => void;
  disabled?: boolean;
  /** Wrap onto several lines instead of one scrolling row. Default `false`. */
  wrap?: boolean;
  /** Accessible name of the group, e.g. "Suggested replies". */
  "aria-label"?: string;
}

function normalize(item: string | PromptSuggestion): PromptSuggestion {
  return typeof item === "string" ? { id: item, label: item } : item;
}

/**
 * Suggested prompts / follow-up questions as one horizontally scrolling row of pill
 * buttons. Edge fades show only on the sides that have more chips (RTL-aware, via
 * `useScrollOverflow`); the scrollbar is hidden but touch and trackpad scrolling work,
 * and focusing a chip scrolls it into view. Renders nothing for an empty list.
 */
export const PromptSuggestions = ({
  suggestions,
  onSelect,
  disabled = false,
  wrap = false,
  className,
  "aria-label": ariaLabel = "Suggestions",
  ...props
}: PromptSuggestionsProps): ReactElement | null => {
  const { ref, left, right } = useScrollOverflow<HTMLDivElement>();
  if (suggestions.length === 0) return null;
  const mask = `linear-gradient(to right, ${left ? "transparent, black 2rem" : "black"}, ${right ? "black calc(100% - 2rem), transparent" : "black"})`;
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("min-w-0 max-w-full", className)}
      {...props}
    >
      <div
        ref={wrap ? undefined : ref}
        // overflow-x clips both axes: py-1/-my-1 leaves room for focus rings without changing the outer height.
        className={cn(
          wrap
            ? "flex flex-wrap gap-2"
            : "-my-1 flex gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
        style={wrap ? undefined : { maskImage: mask, WebkitMaskImage: mask }}
      >
        {suggestions.map((raw) => {
          const item = normalize(raw);
          const prompt = item.prompt ?? (typeof item.label === "string" ? item.label : item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(prompt, item)}
              onFocus={(event) => event.currentTarget.scrollIntoView?.({ block: "nearest", inline: "nearest" })}
              className={cn(
                "inline-flex min-h-8 items-center rounded-[var(--radius-pill,9999px)] border border-foreground/10 bg-background px-3 text-sm text-foreground transition-colors dark:border-border",
                "hover:bg-foreground/6 active:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                wrap ? "max-w-full shrink whitespace-normal py-1 text-left" : "shrink-0 whitespace-nowrap",
                "disabled:pointer-events-none disabled:opacity-50 max-sm:min-h-9",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
