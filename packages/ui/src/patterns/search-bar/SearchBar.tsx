import { Search, X } from "lucide-react";
import type { InputHTMLAttributes, KeyboardEvent, ReactElement, ReactNode, Ref } from "react";
import { useRef } from "react";
import { cn } from "../../lib/utils";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";

export interface SearchBarProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "size" | "onSubmit"> {
  value: string;
  onChange: (value: string) => void;
  /** Swaps the leading search icon for a spinner while a search request is in flight. */
  isLoading?: boolean;
  /** Called when the clear (×) button is pressed. Defaults to `onChange("")`. Pass `false` to hide the button entirely, even with a non-empty value. */
  onClear?: (() => void) | false;
  /** Accessible label for the clear button. @default "Clear search" */
  clearLabel?: string;
  /** Fires on Enter (the mobile keyboard's "search" key) with the current value — for search-on-submit pages; search-as-you-type callers just use `onChange`. */
  onSubmit?: (value: string) => void;
  /** Extra controls after the input, before the clear button — e.g. a mic or camera button. */
  trailingSlot?: ReactNode;
  /** Forwarded ref so a caller can focus the input programmatically. */
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}

/**
 * Mobile keyboard defaults for a search field: a "Search" return key, no
 * auto-capitalising the first letter of a customer name, no autocorrect
 * mangling article numbers. All overridable through the input props spread.
 */
export const searchInputKeyboardProps = {
  inputMode: "search",
  enterKeyHint: "search",
  autoCorrect: "off",
  autoCapitalize: "none",
  spellCheck: false,
} as const satisfies InputHTMLAttributes<HTMLInputElement>;

/** Hides Chromium/Safari's own clear (×) control on `type="search"`, which would otherwise stack on top of ours. */
export const nativeSearchDecorationReset =
  "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none";

/**
 * Pill-shaped search input: leading icon (spinner while `isLoading`), the
 * input, an optional trailing slot and a clear button once there's a value.
 * 44px tall and 16px type on a phone (16px is what keeps iOS Safari from
 * zooming the page on focus), stepping down to 40px/15px from `md`. Unlike
 * `Combobox` it has no result list of its own — the caller owns the results.
 */
export function SearchBar({
  value,
  onChange,
  isLoading,
  onClear,
  clearLabel = "Clear search",
  onSubmit,
  trailingSlot,
  inputRef,
  className,
  onKeyDown,
  ...props
}: SearchBarProps): ReactElement {
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
    } else if (event.key === "Escape" && showClear) {
      event.preventDefault();
      clear();
    }
  };

  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2 rounded-full border border-input bg-background pr-1.5 pl-4 transition-[border-color,box-shadow] duration-150 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25 motion-reduce:transition-none md:h-10",
        className,
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground" aria-hidden={!isLoading}>
        {isLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" aria-hidden="true" />}
      </span>
      <input
        ref={setRefs}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        {...searchInputKeyboardProps}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground md:text-[15px]",
          nativeSearchDecorationReset,
        )}
        {...props}
      />
      {trailingSlot}
      {showClear && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={clear}
          aria-label={clearLabel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-7 md:w-7"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
