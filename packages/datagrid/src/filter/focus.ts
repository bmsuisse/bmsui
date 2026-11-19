/** A filter widget's text-entry control: the search / value input, not a checkbox, slider or the operator select. */
const NON_TEXT_TYPES = ["checkbox", "radio", "hidden", "range", "button", "submit", "reset", "file", "color"];
// Not aria-hidden: Base UI's Select keeps a hidden form input next to its trigger.
const TEXT_INPUT = `${NON_TEXT_TYPES.reduce((sel, type) => `${sel}:not([type="${type}"])`, "input:not([aria-hidden])")}, textarea`;

/**
 * `focusOnOpen` of a filter popup: its first text input. The default would be the
 * first tabbable child, which for a string/number filter is the operator select;
 * whoever opens the popup wants to type. `undefined` keeps that default.
 */
export function firstTextInput(popup: HTMLElement): HTMLElement | undefined {
  return popup.querySelector<HTMLElement>(TEXT_INPUT) ?? undefined;
}
