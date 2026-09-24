import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ComponentType, InputHTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { cn } from "../../lib/utils";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";

export interface SearchPanelMode {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface SearchPanelProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "size"> {
  value: string;
  onChange: (value: string) => void;
  /** Swaps the leading search icon for a spinner while a search request is in flight. */
  isLoading?: boolean;
  /** Extra content after the input, e.g. a mic button. */
  trailingSlot?: ReactNode;
  /** Keyboard-shortcut hint rendered after `trailingSlot`, e.g. `"⌘K"`. Omit to hide it. */
  shortcutHint?: string;
  /** Mode-switcher pills rendered below the input row (e.g. "Search" / "Ask AI"). Omit to hide the row entirely. */
  modes?: SearchPanelMode[];
  activeMode?: string;
  onModeChange?: (key: string) => void;
  /** Squares the panel's bottom corners so a results dropdown anchored directly below it reads as one continuous surface. */
  expanded?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}

/**
 * Bordered search card: an input row (leading icon/spinner, input, optional
 * trailing slot and keyboard-shortcut hint) plus an optional row of
 * mode-switcher pills below it. Headless on results — the caller renders
 * whatever dropdown or inline results belong under it.
 */
export function SearchPanel({
  value,
  onChange,
  isLoading,
  trailingSlot,
  shortcutHint,
  modes,
  activeMode,
  onModeChange,
  expanded = false,
  inputRef,
  className,
  ...props
}: SearchPanelProps): ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col border border-border bg-card shadow-sm",
        expanded ? "rounded-t-2xl border-b-transparent" : "rounded-2xl",
        className,
      )}
    >
      <div className="flex h-14 items-center gap-3 px-4">
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          {...props}
        />
        {trailingSlot}
        {shortcutHint && (
          <kbd
            aria-hidden="true"
            className="hidden shrink-0 items-center rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground select-none sm:inline-flex"
          >
            {shortcutHint}
          </kbd>
        )}
      </div>

      {modes && modes.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-3">
          {modes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onModeChange?.(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                activeMode === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
