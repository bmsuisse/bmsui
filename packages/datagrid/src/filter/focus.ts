/** A filter widget's text-entry control: the search / value input, not a checkbox or the operator select. */
const TEXT_INPUT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea';

/**
 * `onOpenAutoFocus` handler for a filter popover. Radix focuses the first
 * tabbable child, which for a string/number filter is the operator select;
 * whoever opens the popover wants to type, so focus the first text input
 * instead (falling back to Radix's default when there is none).
 */
export function focusFirstTextInput(event: Event): void {
  const input = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(TEXT_INPUT);
  if (!input) return;
  event.preventDefault();
  input.focus();
}
