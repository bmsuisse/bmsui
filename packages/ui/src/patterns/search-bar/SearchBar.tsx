import { Search, X } from "lucide-react";
import type { InputHTMLAttributes, ReactElement, Ref } from "react";
import { cn } from "../../lib/utils";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";

export interface SearchBarProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "size"> {
  value: string;
  onChange: (value: string) => void;
  /** Swaps the leading search icon for a spinner while a search request is in flight. */
  isLoading?: boolean;
  /** Called when the clear (×) button is pressed. Defaults to `onChange("")`. Pass `false` to hide the button entirely, even with a non-empty value. */
  onClear?: (() => void) | false;
  /** Accessible label for the clear button. @default "Clear search" */
  clearLabel?: string;
  /** Forwarded ref so a caller can focus the input programmatically. */
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}

/**
 * Pill-shaped search input: leading icon (swaps to a spinner while
 * `isLoading`), trailing clear button once there's a value. The shape
 * duplicated across several consuming apps' own hand-rolled search boxes —
 * unlike `Combobox`, this has no dropdown/result list of its own, just the
 * input chrome; the caller owns whatever renders the results.
 */
export function SearchBar({
  value,
  onChange,
  isLoading,
  onClear,
  clearLabel = "Clear search",
  inputRef,
  className,
  ...props
}: SearchBarProps): ReactElement {
  const showClear = onClear !== false && value.length > 0;
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground">
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <Search className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-11 w-full rounded-full border border-input bg-background text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
          showClear ? "pr-11" : "pr-4",
          "pl-11",
        )}
        {...props}
      />
      {showClear && (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : onChange(""))}
          aria-label={clearLabel}
          className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
