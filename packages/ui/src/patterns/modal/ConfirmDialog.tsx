import type { ReactElement } from "react";
import { useState } from "react";
import { Button } from "../../primitives/button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  /** Whether the dialog is open. Fully controlled — no internal open state. */
  open: boolean;
  /** Called when Radix wants to change the open state (backdrop click, Esc, close button). */
  onOpenChange: (open: boolean) => void;
  /** Dialog title. */
  title: string;
  /** Optional supporting copy shown under the title. */
  description?: string;
  /** Label for the confirm button. Defaults to `"Confirm"`. */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to `"Cancel"`. */
  cancelLabel?: string;
  /** Called when the user clicks confirm. May return a promise; the dialog waits for it. */
  onConfirm: () => void | Promise<void>;
  /** Visual style of the confirm button. Defaults to `"default"`. */
  variant?: "default" | "destructive";
  /** Forwarded to the confirm button, for test targeting (e.g. Playwright/Testing Library). */
  confirmTestId?: string;
  /** Forwarded to the cancel button, for test targeting. */
  cancelTestId?: string;
}

/**
 * "Are you sure?" confirmation dialog. Unlike `FormModal`, this DOES close
 * itself automatically after a successful `onConfirm` — confirmations are a
 * single yes/no action with no follow-up state to inspect, so there's nothing
 * for the caller to decide. If `onConfirm` throws/rejects, the dialog stays
 * open and the error is not swallowed, so a caller can surface its own error
 * UI without the dialog disappearing out from under it.
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  confirmTestId,
  cancelTestId,
}: ConfirmDialogProps): ReactElement => {
  const [pending, setPending] = useState(false);

  const handleCancel = (): void => {
    onOpenChange(false);
  };

  const handleConfirm = async (): Promise<void> => {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Do not swallow the failure into a silent no-op: surface it (the
      // caller's own error UI is the right place to react to it in detail)
      // and, critically, leave the dialog open instead of closing it as if
      // nothing happened.
      console.error(error);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={handleCancel} disabled={pending} data-testid={cancelTestId}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending}
            data-testid={confirmTestId}
          >
            {pending ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </>
      }
    >
      {null}
    </Modal>
  );
};
