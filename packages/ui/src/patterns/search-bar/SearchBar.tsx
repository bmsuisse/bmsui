import { ExclamationTriangleIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { InputHTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { type ErrorInput, toErrorInfo } from "../../lib/errorState";
import { cn } from "../../lib/utils";
import { InlineError } from "../error-state/ErrorState";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";

export interface SearchBarProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "size"> {
  value: string;
  onChange: (value: string) => void;
  /** Swaps the leading search icon for a spinner while a search request is in flight. */
  loading?: boolean;
  /** @deprecated Use `loading`. */
  isLoading?: boolean;
  /** A failed search request. Marks the input invalid and shows an `InlineError` below it. */
  error?: ErrorInput;
  /** Shows a Retry action in the error line. */
  onRetry?: () => void;
  /** Called when the clear (×) button is pressed. Defaults to `onChange("")`. Pass `false` to hide the button entirely, even with a non-empty value. */
  onClear?: (() => void) | false;
  /** Accessible label for the clear button. @default "Clear search" */
  clearLabel?: string;
  /** Extra buttons inside the pill after the clear button (camera, voice input …). Use `<Button variant="ghost" size="icon-sm" aria-label="…">`. */
  actions?: ReactNode;
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
  loading,
  isLoading,
  error,
  onRetry,
  onClear,
  clearLabel = "Clear search",
  actions,
  inputRef,
  className,
  ...props
}: SearchBarProps): ReactElement {
  const busy = loading ?? isLoading;
  const hasError = toErrorInfo(error) !== undefined;
  const showClear = onClear !== false && value.length > 0;
  return (
    <div className={className}>
      <div
        className={cn(
          "relative flex h-11 w-full items-center gap-1 rounded-full border bg-background pr-2 has-[input:focus-visible]:ring-1 has-[input:focus-visible]:ring-ring",
          hasError ? "border-destructive" : "border-input",
        )}
      >
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground">
          {busy ? (
            <LoadingSpinner size="sm" />
          ) : hasError ? (
            <ExclamationTriangleIcon className="h-4 w-4 text-destructive" aria-hidden="true" />
          ) : (
            <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <input
          ref={inputRef}
          type="search"
          aria-invalid={hasError || undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "h-full min-w-0 flex-1 rounded-full bg-transparent pr-2 pl-11 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none",
            // Chromium/Safari render their own native clear (×) control on
            // type="search" inputs -- left alone, it stacks on top of our own
            // custom clear button below instead of replacing it.
            "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
          )}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            onClick={() => (onClear ? onClear() : onChange(""))}
            aria-label={clearLabel}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {actions}
      </div>
      {hasError && <InlineError error={error} onRetry={onRetry} className="mt-1 ml-4" />}
    </div>
  );
}
