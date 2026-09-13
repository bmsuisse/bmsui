import { ArrowDown } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface ScrollToBottomButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Hidden (not unmounted, not merely disabled) when false. @default true */
  visible?: boolean;
  /** @default "New messages" */
  label?: string;
  /** Where it floats relative to the composer. @default "-3rem" */
  offset?: string;
}

/**
 * A small round pill that floats just above the composer, offering "jump
 * back to the latest message" once the reader has scrolled up. This
 * component only renders the button — it does not track scroll position or
 * count unread messages; a headless chat runtime (assistant-ui) already
 * knows both of those and passes them in as `visible`/`onClick`.
 *
 * **Why `visible={false}` maps to `disabled` + `disabled:invisible` instead
 * of an unmounted / `hidden` element.** This component is designed to be
 * handed directly to a runtime as a `render={<ScrollToBottomButton/>}`
 * target. Runtimes of this shape toggle a button's own `disabled` attribute
 * to mean "not applicable right now" — they don't unmount the element or
 * juggle a separate visibility prop. Mapping `visible` onto that same
 * `disabled` channel means this component works unchanged as such a target:
 * the runtime's own disabled-toggling is exactly what shows and hides it.
 * `disabled:invisible` (rather than `disabled:hidden`) keeps the element in
 * the layout — `self-center` positioning above the composer stays stable
 * instead of reflowing neighbours as it flips on and off — while still being
 * unclickable and invisible to a screen reader's tab order.
 *
 * **`offset` and `--ui-bottom-inset`.** By default this floats `-3rem`
 * above wherever it's placed (typically absolutely positioned inside or
 * beside a `ChatComposer`). If a consumer instead docks it outside a sticky
 * footer — e.g. anchored to the viewport bottom the way `ActionButton`'s
 * `placement="corner"` anchors to `bottom-[var(--ui-bottom-inset,...)]` —
 * they should fold that same `--ui-bottom-inset` custom property into their
 * own wrapper's position (or into `offset` itself) so this button clears a
 * docked tab bar / safe-area inset the same way the rest of this library's
 * floating elements do. This component doesn't hard-wire that variable
 * itself because its default use (floating relative to a composer that
 * already sits above the inset) doesn't need it.
 */
export const ScrollToBottomButton = forwardRef<HTMLButtonElement, ScrollToBottomButtonProps>(
  ({ visible = true, label = "New messages", offset = "-3rem", disabled, style, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        disabled={visible === false || disabled}
        style={{ top: offset, ...style }}
        data-slot="scroll-to-bottom-button"
        className={cn(
          "absolute z-10 self-center rounded-full size-10 shadow-sm",
          "border border-input bg-background hover:bg-accent",
          "flex items-center justify-center text-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:invisible",
          className,
        )}
        {...props}
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
    );
  },
);
ScrollToBottomButton.displayName = "ScrollToBottomButton";
