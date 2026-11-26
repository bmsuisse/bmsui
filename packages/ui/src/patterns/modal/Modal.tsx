import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { I18nText } from "../../i18n/locale";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";

/** Scrolling body of a composed `Modal` (children of `Modal` that wants its own body/footer layout). */
export const ModalBody = DialogBody;
/** Pinned footer of a composed `Modal`. */
export const ModalFooter = DialogFooter;

export interface ModalProps {
  /** Whether the modal is open. Modal is fully controlled — no internal open state. */
  open: boolean;
  /** Called when the open state should change (backdrop click, Esc, close button). */
  onOpenChange: (open: boolean) => void;
  /** Dialog title, rendered in `DialogTitle`. */
  title: string;
  /** Optional supporting copy, rendered in `DialogDescription` under the title. */
  description?: string;
  /**
   * Body content. Plain children are wrapped in a scrolling `ModalBody`; when a direct child is a
   * `ModalBody` or `ModalFooter` the children are laid out as given (compose your own body/footer).
   */
  children: ReactNode;
  /** Optional footer content (typically action buttons), rendered in `DialogFooter`. */
  footer?: ReactNode;
  /** Extra classes applied to the centred dialog, e.g. to override the default width. */
  className?: string;
  /** Controls next to the close button in the header (a menu, an icon button). */
  headerActions?: ReactNode;
  /** A back arrow in front of the title, for a modal that moved on to another record. */
  onBack?: () => void;
  /** Tooltip of the back arrow, usually the name of what it goes back to. */
  backTitle?: string;
  /**
   * Keep the centred dialog on phones instead of the bottom sheet, for the rare modal whose content
   * (a wide table, an image, a picker whose dropdown overflows) needs a fixed desktop-shaped box.
   */
  alwaysCentered?: boolean;
}

function isComposed(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return false;
    if (child.type === ModalBody || child.type === ModalFooter) return true;
    return child.type === Fragment && isComposed(child.props.children);
  });
}

/**
 * The one modal. A centred dialog on desktop and a bottom sheet on phones (slide-up, drag handle,
 * keyboard-aware): use it for anything that is not a plain confirmation (`ConfirmDialog`) or a form with a
 * submit button (`FormModal`); those two are built on the same surface.
 */
export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  headerActions,
  onBack,
  backTitle,
  alwaysCentered,
}: ModalProps): ReactElement => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={className} alwaysCentered={alwaysCentered}>
      <DialogHeader>
        <div className="flex items-start gap-2 pr-8">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              title={backTitle}
              data-testid="modal-back"
              className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:size-11"
            >
              <ArrowLeftIcon className="size-4 max-md:size-6" />
              <span className="sr-only">
                <I18nText k="common.back" />
              </span>
            </button>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <DialogTitle className="max-md:text-[18px]">{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </div>
          {headerActions ? <div className="flex shrink-0 items-center gap-1">{headerActions}</div> : null}
        </div>
      </DialogHeader>
      {isComposed(children) ? (
        children
      ) : (
        <DialogBody>{children}</DialogBody>
      )}
      {footer ? <DialogFooter>{footer}</DialogFooter> : null}
    </DialogContent>
  </Dialog>
);
