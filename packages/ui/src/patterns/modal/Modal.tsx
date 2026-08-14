import type { ReactElement, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";

export interface ModalProps {
  /** Whether the modal is open. Modal is fully controlled — no internal open state. */
  open: boolean;
  /** Called when Radix wants to change the open state (backdrop click, Esc, close button). */
  onOpenChange: (open: boolean) => void;
  /** Dialog title, rendered in `DialogTitle`. */
  title: string;
  /** Optional supporting copy, rendered in `DialogDescription` under the title. */
  description?: string;
  /** Body content of the modal. */
  children: ReactNode;
  /** Optional footer content (typically action buttons), rendered in `DialogFooter`. */
  footer?: ReactNode;
  /** Extra classes applied to `DialogContent`, e.g. to override the default width. */
  className?: string;
}

/**
 * Base structural wrapper around the `@bmsuisse/ui` Dialog primitives: title,
 * optional description, body, and an optional footer. Use this directly for
 * modals that don't fit `ConfirmDialog` or `FormModal`; those two are built
 * on top of the same shape.
 */
export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps): ReactElement => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={className}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      {children}
      {footer ? <DialogFooter>{footer}</DialogFooter> : null}
    </DialogContent>
  </Dialog>
);
