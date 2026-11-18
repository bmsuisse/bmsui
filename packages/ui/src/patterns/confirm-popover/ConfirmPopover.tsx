import { type ReactElement, type ReactNode, useId, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { getI18n, useLabels } from "../../i18n/locale";
import type { IntegratedI18n } from "../../i18n/locale";

export interface ConfirmPopoverLabels {
  confirm: string;
  keep: string;
}

export const confirmPopoverLabelsFor = ({ t }: IntegratedI18n): ConfirmPopoverLabels => ({
  confirm: t("confirmPopover.confirm"),
  keep: t("confirmPopover.keep"),
});

export const defaultConfirmPopoverLabels: ConfirmPopoverLabels = confirmPopoverLabelsFor(getI18n("en", false));

export interface ConfirmPopoverProps {
  /** The button that opens it (one element; rendered with `asChild`). */
  trigger: ReactElement;
  /** What will happen, in one sentence. */
  message: ReactNode;
  /** Text of the confirm button. Overrides `labels.confirm`. */
  confirmLabel?: string;
  /** Text of the safe button. Overrides `labels.keep`. */
  keepLabel?: string;
  labels?: Partial<ConfirmPopoverLabels>;
  /** Disables the confirm button (a request is in flight). */
  pending?: boolean;
  /** Runs on confirm. A returned promise keeps the popover open (confirm disabled) until it settles; a rejection keeps it open. */
  onConfirm: () => void | Promise<unknown>;
  /** `destructive` (default) styles the confirm button red. */
  tone?: "destructive" | "default";
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Portal target, e.g. the Dialog content when used inside a modal. */
  container?: HTMLElement | null;
}

/**
 * In-page confirmation for a risky action: states the consequence right next to
 * the button instead of opening a modal. Focus lands on the safe action
 * ("Keep"), Escape or an outside click closes it. Use `ConfirmDialog` when the
 * decision needs more room or the whole page should be blocked.
 */
export const ConfirmPopover = ({
  trigger,
  message,
  confirmLabel,
  keepLabel,
  labels,
  pending = false,
  onConfirm,
  tone = "destructive",
  align = "end",
  side,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  container,
}: ConfirmPopoverProps): ReactElement => {
  const l = useLabels(confirmPopoverLabelsFor, labels);
  const [inner, setInner] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const messageId = useId();
  const open = openProp ?? inner;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInner(next);
    onOpenChange?.(next);
  };

  const confirm = async () => {
    try {
      const result = onConfirm();
      if (result && typeof (result as Promise<unknown>).then === "function") {
        setBusy(true);
        await result;
      }
      setOpen(false);
    } catch {
      // Stay open so the user can retry; the caller shows the error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        container={container}
        role="alertdialog"
        aria-describedby={messageId}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          keepRef.current?.focus();
        }}
        className={cn("w-72 text-[13px]", className)}
      >
        <p id={messageId} className="leading-snug">
          {message}
        </p>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button ref={keepRef} size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {keepLabel ?? l.keep}
          </Button>
          <Button
            size="sm"
            variant={tone === "destructive" ? "destructive" : "default"}
            disabled={pending || busy}
            onClick={() => void confirm()}
          >
            {confirmLabel ?? l.confirm}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
