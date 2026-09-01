import type { ReactElement } from "react";
import { useLayoutEffect, useRef } from "react";
import type { StringColumn } from "../column/types";
import { Textarea } from "../components/ui/textarea";
import { EditFieldError } from "./EditFieldError";
import { editErrorId, type EditWidgetProps } from "./widget-types";

/**
 * Default inline editor for a `type: "string"` column with `multiline: true`:
 * an auto-growing `<textarea>` in place of `StringEditor`'s single-line
 * `<Input>`. Dispatched by `registry.tsx`'s existing `case "string":` branch
 * — a rendering choice, not a new column `type` — so it works identically
 * under both `DataGridProps.editing` (row-batch) and `.cellEditing`
 * (immediate-apply) modes with zero extra wiring in either.
 */
export function MultilineStringEditor<TRow>({
  column,
  rowId,
  value,
  onChange,
  error,
  autoFocus,
}: EditWidgetProps<StringColumn<TRow>>): ReactElement {
  const errorId = editErrorId(rowId, column.id);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Captures the cursor position right after each native edit (in the
  // `onChange` handler below, before React re-renders) so it can be
  // restored in the layout effect afterward — this element can otherwise
  // lose focus and reset its caret to 0 on a re-render that changes OTHER
  // props alongside `value` (e.g. `aria-invalid`/`aria-describedby`
  // toggling because a `column.validateEdit` result flipped on the very
  // keystroke that made the field valid) even though the value change
  // itself gave no reason to move it. Restoring proactively — not only when
  // the element happens to still be focused — is what actually fixes this:
  // by the time this effect runs, focus has typically already moved away.
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const text = value === null || value === undefined ? "" : String(value);

  // Grows the textarea to fit its content instead of showing an internal
  // scrollbar for a few extra lines — resetting to "auto" first (rather than
  // reading `scrollHeight` against whatever height was already set) is what
  // lets this shrink back down after deleting lines, not just grow. Runs as
  // a layout effect (not a plain effect) so the refocus/selection-restore
  // below lands before the browser paints, avoiding a visible caret jump.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    if (selectionRef.current) {
      if (document.activeElement !== el) el.focus();
      el.setSelectionRange(selectionRef.current.start, selectionRef.current.end);
    }
  }, [text]);

  return (
    <div>
      <Textarea
        ref={textareaRef}
        className="resize-none overflow-hidden"
        aria-label={`Edit ${column.header}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-testid={`edit-${rowId}-${column.id}`}
        autoFocus={autoFocus}
        value={text}
        onChange={(event) => {
          selectionRef.current = { start: event.target.selectionStart ?? 0, end: event.target.selectionEnd ?? 0 };
          onChange(event.target.value);
        }}
      />
      {error && <EditFieldError id={errorId} message={error} />}
    </div>
  );
}
