import type { FormEvent, ReactElement, ReactNode } from "react";
import { useState } from "react";
import { Button } from "../../primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";

export interface FormModalProps {
  /** Whether the modal is open. Fully controlled — no internal open state. */
  open: boolean;
  /** Called when Radix wants to change the open state (backdrop click, Esc, close button). */
  onOpenChange: (open: boolean) => void;
  /** Dialog title. */
  title: string;
  /** Optional supporting copy shown under the title. */
  description?: string;
  /** Form field content, rendered inside the `<form>`. */
  children: ReactNode;
  /** Called on submit (button click or Enter in a field). May return a promise. */
  onSubmit: () => void | Promise<void>;
  /** Label for the submit button. Defaults to `"Save"`. */
  submitLabel?: string;
  /** Label for the cancel button. Defaults to `"Cancel"`. */
  cancelLabel?: string;
  /**
   * Disables the submit button (e.g. required fields still empty), on top of
   * the automatic disable while `onSubmit`'s promise is pending. Cancel
   * stays enabled either way. Defaults to `false`.
   */
  submitDisabled?: boolean;
  /** Extra classes applied to `DialogContent`, e.g. to override the default width. */
  className?: string;
  /** Forwarded to the submit button, for test targeting (e.g. Playwright/Testing Library). */
  submitTestId?: string;
  /** Forwarded to the cancel button, for test targeting. */
  cancelTestId?: string;
}

/**
 * Modal wrapping a form. Unlike `ConfirmDialog`, this does NOT close itself
 * after a successful `onSubmit` — forms commonly have server-side validation
 * and shouldn't vanish on failure, so closing after success is left entirely
 * to the caller (typically by calling `onOpenChange(false)` once its own
 * submit handler resolves without error).
 */
export const FormModal = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  submitDisabled = false,
  className,
  submitTestId,
  cancelTestId,
}: FormModalProps): ReactElement => {
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);
    try {
      await onSubmit();
    } finally {
      setPending(false);
    }
  };

  const handleCancel = (): void => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={pending}
              data-testid={cancelTestId}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={pending || submitDisabled} data-testid={submitTestId}>
              {pending ? `${submitLabel}…` : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
