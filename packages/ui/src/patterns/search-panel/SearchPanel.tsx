import { Search, X } from "lucide-react";
import type { ComponentType, InputHTMLAttributes, KeyboardEvent, ReactElement, ReactNode, Ref } from "react";
import { useRef } from "react";
import { cn } from "../../lib/utils";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";
import { searchInputKeyboardProps } from "../search-bar/SearchBar";

export interface SearchPanelMode {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface SearchPanelProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "size" | "onSubmit"> {
  value: string;
  onChange: (value: string) => void;
  /** Swaps the leading search icon for a spinner while a search request is in flight. */
  isLoading?: boolean;
  /** Called when the clear (×) button is pressed. Defaults to `onChange("")`. Pass `false` to hide the button. */
  onClear?: (() => void) | false;
  /** Accessible label for the clear button. @default "Clear search" */
  clearLabel?: string;
  /** Fires on Enter with the current value. */
  onSubmit?: (value: string) => void;
  /** Extra content after the input, e.g. a mic button. */
  trailingSlot?: ReactNode;
  /** Keyboard-shortcut hint rendered after `trailingSlot`, e.g. `"⌘K"`. Omit to hide it. Hidden below `sm` regardless — a phone has no ⌘. */
  shortcutHint?: string;
  /** Mode-switcher pills rendered below the input row (e.g. "Search" / "Ask AI"). Omit to hide the row entirely. */
  modes?: SearchPanelMode[];
  activeMode?: string;
  onModeChange?: (key: string) => void;
  /** Squares the panel's bottom corners so a results dropdown anchored directly below it reads as one continuous surface. */
  expanded?: boolean;
  /**
   * `card` (default) is a bordered, elevated surface for use in page flow;
   * `flush` drops border, radius and shadow for embedding in a header bar or
   * an overlay that already draws the surface.
   */
  appearance?: "card" | "flush";
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}

/**
 * Search card: an input row (leading icon/spinner, input, optional trailing
 * slot, clear button and keyboard-shortcut hint) plus an optional row of
 * mode-switcher pills below it. Headless on results — the caller renders
 * whatever dropdown or inline results belong under it (or wraps everything in
 * `SearchOverlay`, which does the phone/desktop presentation for you).
 */
export function SearchPanel({
  value,
  onChange,
  isLoading,
  onClear,
  clearLabel = "Clear search",
  onSubmit,
  trailingSlot,
  shortcutHint,
  modes,
  activeMode,
  onModeChange,
  expanded = false,
  appearance = "card",
  inputRef,
  className,
  onKeyDown,
  ...props
}: SearchPanelProps): ReactElement {
  const showClear = onClear !== false && value.length > 0;
  const innerRef = useRef<HTMLInputElement | null>(null);

  const setRefs = (node: HTMLInputElement | null): void => {
    innerRef.current = node;
    if (typeof inputRef === "function") inputRef(node);
    else if (inputRef) (inputRef as { current: HTMLInputElement | null }).current = node;
  };

  const clear = (): void => {
    if (onClear) onClear();
    else onChange("");
    innerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Enter" && onSubmit) {
      event.preventDefault();
      onSubmit(value);
    }
  };

  return (
    <div
      role="search"
      className={cn(
        "flex flex-col bg-card text-card-foreground",
        appearance === "card" &&
          "border border-border shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_12px_-6px_rgb(0_0_0/0.08)] transition-[border-color,box-shadow] duration-150 focus-within:border-ring/60 focus-within:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-10px_rgb(0_0_0/0.14)] motion-reduce:transition-none",
        appearance === "card" && (expanded ? "rounded-t-2xl border-b-transparent" : "rounded-2xl"),
        className,
      )}
    >
      <div className="flex h-14 items-center gap-3 pr-2 pl-4">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
          {isLoading ? <LoadingSpinner size="sm" /> : <Search className="h-5 w-5" aria-hidden="true" />}
        </span>
        <input
          ref={setRefs}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          {...searchInputKeyboardProps}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground md:text-[15px]"
          {...props}
        />
        {showClear && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
            aria-label={clearLabel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-8 md:w-8"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {trailingSlot}
        {shortcutHint && (
          <kbd
            aria-hidden="true"
            className="mr-1 hidden h-6 shrink-0 items-center rounded-md border border-border bg-muted/60 px-1.5 font-sans text-[11px] font-medium text-muted-foreground select-none sm:inline-flex"
          >
            {shortcutHint}
          </kbd>
        )}
      </div>

      {modes && modes.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {modes.map(({ key, label, icon: Icon }) => {
            const active = activeMode === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onModeChange?.(key)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none md:h-8 md:px-3",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
