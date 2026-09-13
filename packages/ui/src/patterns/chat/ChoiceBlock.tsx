import { HelpCircle, Shield, ShieldAlert } from "lucide-react";
import { forwardRef, useEffect, useId, useMemo } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";

/** One selectable option in a `ChoiceBlock`. */
export interface ChoiceOption {
  /** Stable identity, compared against `value` for selection. */
  id: string;
  /** Primary label shown on the option button. */
  label: string;
  /** Optional supporting copy shown under the label in `text-xs text-muted-foreground`. */
  description?: string;
  /** Excludes the option from selection and from keyboard-shortcut assignment. */
  disabled?: boolean;
}

// `onSelect` is omitted from the inherited DOM attributes on purpose: React's
// own `onSelect` is a text-selection event handler taking a SyntheticEvent,
// which is structurally incompatible with this component's option callback.
// The domain meaning wins here — a chat decision block has no use for the DOM
// select event, and `onSelect(option)` is the name every consumer expects.
export interface ChoiceBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The prompt text/node, e.g. "Which of these did you mean?" */
  question: ReactNode;
  /** The choices offered. Order determines shortcut-key and grid assignment. */
  options: ChoiceOption[];
  /** Controlled chosen option id. The consumer persists it — this component keeps no memory. */
  value?: string | null;
  onSelect?: (option: ChoiceOption) => void;
  /** No longer the live prompt: dims everything but keeps `value` highlighted. */
  disabled?: boolean;
  /** `neutral`: HelpCircle + a top divider. `warning`: amber card with a shield eyebrow. @default "neutral" */
  tone?: "neutral" | "warning";
  /** Uppercase eyebrow, e.g. "Approval required". */
  eyebrow?: ReactNode;
  /** Right-aligned mono chip, e.g. a tool name. */
  meta?: ReactNode;
  /** 1–9 then A–Z pick options, while live and no text field is focused. @default true */
  keyboardShortcuts?: boolean;
  /** Overrides the automatic 2-column heuristic. */
  columns?: 1 | 2;
  labels?: { optionsGroup?: string };
}

const SHORTCUT_KEYS = "123456789abcdefghijklmnopqrstuvwxyz".split("");

/** Assigns a display shortcut key to each option by index, matching the keydown mapping below. */
function shortcutFor(index: number): string | undefined {
  return SHORTCUT_KEYS[index]?.toUpperCase();
}

/**
 * A unified inline decision surface for a chat transcript, built after
 * noticing a real product had shipped two components that were secretly the
 * same shape: a "which of these did you mean?" disambiguation prompt with
 * numbered options and keyboard shortcuts, and an amber human-in-the-loop
 * approval card ("this tool wants to send mail — approve?"). The approval
 * card *is* the 2-option case of the decision prompt, with a warning tone
 * instead of a neutral one — same options array, same selection model, same
 * keyboard shortcuts, just dressed differently and with the stakes raised.
 * Maintaining them as two components meant every fix (the odd-count grid
 * span, the shortcut-vs-textarea conflict, the "selection persists after
 * disabled" rule) had to land twice and drifted the first time it didn't.
 *
 * **Controlled, no memory.** Like `AiSuggestion`, `value` is owned entirely
 * by the consumer. This matters more here than there: a chat transcript
 * re-renders old messages constantly as new ones stream in, and a decision
 * made three turns ago must keep reading as made — see the selection-persists-
 * through-disabled rule below.
 *
 * **Selection persists through `disabled`.** Once a question is answered the
 * consumer flips `disabled` (the prompt is no longer live) but keeps passing
 * the same `value`. The chosen option must stay visibly highlighted and its
 * siblings dimmed — a settled decision has to read as settled when scrolling
 * back through the transcript, not revert to "all options look equally live."
 * This is why the dimming logic below is keyed only on `value`, never on
 * `disabled`.
 *
 * **Warning tone is amber-filled, not primary, when selected.** The approval
 * case is not "the app's primary action" — coloring the chosen option with
 * the brand's primary color would visually claim it's a normal preference
 * pick. It's a consequential, human-authorized action, so the selected state
 * borrows the same amber the card itself is built from, keeping the whole
 * card's story ("this is a to a real-world side effect") consistent from the
 * eyebrow down to the button someone actually pressed.
 *
 * **Keyboard shortcuts vs. the composer.** This block renders inline under
 * an always-focused chat composer, so a global `1`/`2`/`a`/`b` hotkey layer
 * is only safe if it gets out of the way of normal typing. The listener
 * ignores the event whenever any modifier key is held, `defaultPrevented` is
 * already set by something else, or the event's target is a `TEXTAREA`, an
 * `INPUT`, or `isContentEditable` — those three cover the composer itself,
 * any inline edit field, and rich-text editors alike. Only once a key is
 * confirmed to pick a live, non-disabled option does the handler call
 * `preventDefault()`, so an unrecognized key (or one that maps past the end
 * of the option list) never blocks default browser behavior.
 *
 * **Column heuristic.** Two columns read faster for short options ("Yes" /
 * "No", first names) but wrap awkwardly for anything longer, so the default
 * is 2 columns only when every label is ≤ 18 characters; `columns` overrides
 * this outright for a consumer that knows better. An odd option count in the
 * 2-column grid lets its last option span both columns rather than leaving a
 * lonely half-empty cell.
 */
export const ChoiceBlock = forwardRef<HTMLDivElement, ChoiceBlockProps>(function ChoiceBlock(
  {
    question,
    options,
    value,
    onSelect,
    disabled = false,
    tone = "neutral",
    eyebrow,
    meta,
    keyboardShortcuts = true,
    columns,
    labels,
    className,
    ...props
  },
  ref,
): ReactElement {
  const questionId = useId();

  const resolvedColumns = columns ?? (options.every((o) => o.label.length <= 18) ? 2 : 1);

  const live = !disabled;

  useEffect(() => {
    if (!live || !keyboardShortcuts) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented) return;

      // This block lives inline under an always-focused chat composer. A
      // global shortcut layer must never eat a keystroke meant for typing,
      // so any TEXTAREA/INPUT/contentEditable target is ignored outright —
      // that covers the composer, an inline edit field, and rich-text areas.
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT" || target.isContentEditable) return;
      }

      const index = SHORTCUT_KEYS.indexOf(event.key.toLowerCase());
      if (index === -1) return;

      const option = options[index];
      if (!option || option.disabled) return;

      event.preventDefault();
      onSelect?.(option);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, keyboardShortcuts, options, onSelect]);

  const groupProps = labels?.optionsGroup
    ? { "aria-label": labels.optionsGroup }
    : { "aria-labelledby": questionId };

  const optionButtons = useMemo(
    () =>
      options.map((option, index) => {
        const selected = value != null && option.id === value;
        const dimmed = value != null && !selected;
        const isLastOddSpan = resolvedColumns === 2 && options.length % 2 === 1 && index === options.length - 1;

        return (
          <button
            key={option.id}
            type="button"
            data-slot="choice-option"
            aria-pressed={selected}
            disabled={disabled || option.disabled}
            onClick={() => {
              if (disabled || option.disabled) return;
              onSelect?.(option);
            }}
            className={cn(
              "flex min-h-11 flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed",
              isLastOddSpan && "col-span-2",
              tone === "warning"
                ? selected
                  // Dark ink on the amber fill in BOTH themes: white on
                  // amber-500 is ~2.1:1 and fails AA outright, while
                  // amber-950 on amber-500 clears 7:1. The fill is what
                  // carries "this is the consequential choice"; the text
                  // colour just has to stay readable on it.
                  ? "border-amber-500 bg-amber-500 text-amber-950"
                  : "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
                : selected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-accent",
              dimmed && "opacity-50",
              (disabled || option.disabled) && !selected && "opacity-40",
            )}
          >
            <span className="flex w-full items-center gap-2">
              {keyboardShortcuts && shortcutFor(index) && (
                <span
                  data-slot="choice-shortcut"
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-medium",
                    tone === "warning" && selected
                      ? "border-amber-950/30 text-amber-950"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {shortcutFor(index)}
                </span>
              )}
              <span className="font-medium">{option.label}</span>
            </span>
            {option.description && (
              <span
                className={cn(
                  "text-xs",
                  tone === "warning" && selected ? "text-amber-950/80" : "text-muted-foreground",
                )}
              >
                {option.description}
              </span>
            )}
          </button>
        );
      }),
    [options, value, disabled, tone, resolvedColumns, keyboardShortcuts, onSelect],
  );

  if (tone === "warning") {
    return (
      <div
        ref={ref}
        data-slot="choice-block"
        data-tone="warning"
        className={cn(
          "rounded-xl border border-amber-500 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-300",
          disabled && "opacity-80",
          className,
        )}
        {...props}
      >
        {(eyebrow != null || meta != null) && (
          <div className="mb-2 flex items-center justify-between gap-2">
            {eyebrow != null && (
              <span
                data-slot="choice-eyebrow"
                className="text-xs font-semibold uppercase tracking-wide"
              >
                {eyebrow}
              </span>
            )}
            {meta != null && (
              <span data-slot="choice-meta" className="ml-auto font-mono text-xs">
                {meta}
              </span>
            )}
          </div>
        )}
        <div id={questionId} data-slot="choice-question" className="mb-3 flex items-center gap-2 text-sm font-medium">
          {value != null ? (
            <ShieldAlert aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <Shield aria-hidden="true" className="size-4 shrink-0" />
          )}
          {question}
        </div>
        <div
          role="group"
          {...groupProps}
          data-slot="choice-options"
          className={cn("grid gap-2", resolvedColumns === 2 ? "grid-cols-2" : "grid-cols-1")}
        >
          {optionButtons}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-slot="choice-block"
      data-tone="neutral"
      className={cn("border-t border-border pt-3", disabled && "opacity-80", className)}
      {...props}
    >
      <div id={questionId} data-slot="choice-question" className="mb-3 flex items-center gap-2 text-sm font-medium">
        <HelpCircle aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        {question}
      </div>
      <div
        role="group"
        {...groupProps}
        data-slot="choice-options"
        className={cn("grid gap-2", resolvedColumns === 2 ? "grid-cols-2" : "grid-cols-1")}
      >
        {optionButtons}
      </div>
    </div>
  );
});
