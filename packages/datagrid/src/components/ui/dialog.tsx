import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { forwardRef, useRef, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { openTrigger } from "./trigger";

export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;

export const DialogTrigger = forwardRef<HTMLButtonElement, { asChild?: boolean; children?: ReactNode }>(
  ({ asChild, children }, ref) => <DialogPrimitive.Trigger ref={ref} {...openTrigger(asChild, children)} />,
);
DialogTrigger.displayName = "DialogTrigger";

export function DialogContent({
  className,
  children,
  focusOnOpen,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  /** The element to focus on open; `undefined` keeps the default (the first tabbable child). */
  focusOnOpen?: (popup: HTMLElement) => HTMLElement | undefined;
}) {
  const popup = useRef<HTMLDivElement>(null);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Popup
        ref={popup}
        initialFocus={focusOnOpen && (() => (popup.current && focusOnOpen(popup.current)) ?? true)}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
          <XMarkIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

export const DialogHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("flex flex-col gap-1.5", className)} {...props} />
);

export function DialogTitle({ className, ...props }: ComponentPropsWithoutRef<"h2">) {
  return <DialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export const DialogFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("flex justify-end gap-2", className)} {...props} />
);
