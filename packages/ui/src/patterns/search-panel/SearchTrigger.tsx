import { Search } from "lucide-react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

export interface SearchTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible label, also used as the tooltip text by callers that wrap this in one. @default "Search" */
  label?: string;
  /**
   * `icon` (default) is a round icon-only button for a toolbar; `field` is a
   * search-field-shaped button (icon, placeholder text, shortcut hint) for a
   * header where the search deserves to be seen, not found.
   */
  variant?: "icon" | "field";
  /** `field` variant only: the placeholder-style text. Defaults to `label`. */
  placeholder?: string;
  /** `field` variant only: keyboard shortcut hint, e.g. `"⌘K"`. Hidden below `sm`. */
  shortcutHint?: string;
}

/**
 * Button that opens a search overlay (a `SearchOverlay`, a `SearchPanel` in a
 * dropdown — this owns no state or panel of its own). 40px tall on a phone,
 * 36px from `md`. For a full-width always-visible input instead, use `SearchBar`.
 */
export function SearchTrigger({
  label = "Search",
  variant = "icon",
  placeholder,
  shortcutHint,
  className,
  ...props
}: SearchTriggerProps): ReactElement {
  const base =
    "inline-flex shrink-0 items-center text-muted-foreground transition-[background-color,color,border-color] duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

  if (variant === "field") {
    return (
      <button
        type="button"
        aria-label={label}
        className={cn(
          base,
          "h-10 w-full gap-2.5 rounded-xl border border-input bg-background pr-1.5 pl-3 text-left hover:border-ring/50 hover:bg-muted/40 md:h-9",
          className,
        )}
        {...props}
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[14px]">{placeholder ?? label}</span>
        {shortcutHint && (
          <kbd
            aria-hidden="true"
            className="hidden h-6 shrink-0 items-center rounded-md border border-border bg-muted/60 px-1.5 font-sans text-[11px] font-medium text-muted-foreground select-none sm:inline-flex"
          >
            {shortcutHint}
          </kbd>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(base, "h-10 w-10 justify-center rounded-full hover:bg-muted md:h-9 md:w-9", className)}
      {...props}
    >
      <Search className="h-5 w-5 md:h-[18px] md:w-[18px]" aria-hidden="true" />
    </button>
  );
}
