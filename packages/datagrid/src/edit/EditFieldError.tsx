import type { ReactElement } from "react";

/**
 * The error text every built-in editor shows under its control, associated
 * with it via `id` + the control's own `aria-describedby={editErrorId(...)}`
 * — pulled out to one place so the a11y wiring/styling convention can't
 * drift between the 5 editors the way five independent copies of the same
 * `<span>` inevitably would.
 */
export function EditFieldError({ id, message }: { id: string; message: string }): ReactElement {
  return (
    <span id={id} className="mt-0.5 block text-xs text-destructive">
      {message}
    </span>
  );
}
