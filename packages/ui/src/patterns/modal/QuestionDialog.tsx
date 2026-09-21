import type { ReactElement } from "react";
import { useState } from "react";
import { Button, type ButtonProps } from "../../primitives/button";
import { DialogActions } from "./DialogActions";
import { Modal } from "./Modal";

export interface QuestionDialogAction {
  /** Button label. */
  label: string;
  /** Called when this action is clicked. May return a promise; the dialog waits for it before closing. */
  onClick: () => void | Promise<void>;
  /** Visual style of this action's button. Defaults to `"default"`. */
  variant?: ButtonProps["variant"];
  /** Forwarded to this action's `Button`, for test targeting. */
  testId?: string;
}

export interface QuestionDialogProps {
  /** Whether the dialog is open. Fully controlled — no internal open state. */
  open: boolean;
  /** Called when Radix wants to change the open state (backdrop click, Esc, close button, Cancel). */
  onOpenChange: (open: boolean) => void;
  /** Dialog title. */
  title: string;
  /** Optional supporting copy shown under the title. */
  description?: string;
  /**
   * The dialog's non-cancel actions, ordered from *furthest from Cancel* to
   * *nearest to Cancel* (see `DialogActions`) — e.g.
   * `[{ label: "Don't Save", ... }, { label: "Save", ... }]` puts "Save"
   * next to Cancel on every platform.
   */
  actions: QuestionDialogAction[];
  /** Label for the cancel button. Defaults to `"Cancel"`. */
  cancelLabel?: string;
  /** Forwarded to the cancel button, for test targeting. */
  cancelTestId?: string;
}

/**
 * A dialog asking a question with any number of actions plus a Cancel —
 * `ConfirmDialog` generalized past the fixed confirm/cancel pair, for
 * prompts like "Save changes before closing?" (Don't Save / Cancel / Save).
 * Like `ConfirmDialog`, it closes itself automatically after a successful
 * action click — if the clicked action's `onClick` throws/rejects, the
 * dialog stays open (and the error isn't swallowed) so a caller can surface
 * its own error UI. Cancel always closes immediately.
 *
 * Button order follows the current platform's own convention via
 * `DialogActions` — pick `actions`' order by *meaning* (least to most
 * committal, say), not by which edge Cancel happens to land on.
 */
export const QuestionDialog = ({
  open,
  onOpenChange,
  title,
  description,
  actions,
  cancelLabel = "Cancel",
  cancelTestId,
}: QuestionDialogProps): ReactElement => {
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const pending = pendingIndex !== null;

  const handleCancel = (): void => {
    onOpenChange(false);
  };

  const handleActionClick = async (action: QuestionDialogAction, index: number): Promise<void> => {
    setPendingIndex(index);
    try {
      await action.onClick();
      onOpenChange(false);
    } catch (error) {
      // Do not swallow the failure into a silent no-op: surface it (the
      // caller's own error UI is the right place to react to it in detail)
      // and, critically, leave the dialog open instead of closing it as if
      // nothing happened.
      console.error(error);
    } finally {
      setPendingIndex(null);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <DialogActions
          actions={actions.map((action, index) => (
            <Button
              key={action.label}
              variant={action.variant ?? "default"}
              onClick={() => handleActionClick(action, index)}
              disabled={pending}
              data-testid={action.testId}
            >
              {pendingIndex === index ? `${action.label}…` : action.label}
            </Button>
          ))}
          cancel={
            <Button variant="outline" onClick={handleCancel} disabled={pending} data-testid={cancelTestId}>
              {cancelLabel}
            </Button>
          }
        />
      }
    >
      {null}
    </Modal>
  );
};
