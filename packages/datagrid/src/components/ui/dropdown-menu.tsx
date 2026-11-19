import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { openTrigger } from "./trigger";

export const DropdownMenu = MenuPrimitive.Root;

export const DropdownMenuTrigger = forwardRef<HTMLButtonElement, { asChild?: boolean; children?: ReactNode }>(
  ({ asChild, children }, ref) => <MenuPrimitive.Trigger ref={ref} {...openTrigger(asChild, children)} />,
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export function DropdownMenuContent({
  className,
  align,
  finalFocus,
  ...props
}: ComponentPropsWithoutRef<"div"> &
  Pick<MenuPrimitive.Positioner.Props, "align"> &
  Pick<MenuPrimitive.Popup.Props, "finalFocus">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} sideOffset={4} collisionPadding={8} className="z-50">
        <MenuPrimitive.Popup
          finalFocus={finalFocus}
          className={cn(
            "min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export const DropdownMenuItem = forwardRef<
  HTMLDivElement,
  Omit<MenuPrimitive.Item.Props, "className"> & { className?: string; danger?: boolean }
>(({ className, danger, ...props }, ref) => (
  <MenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      danger &&
        "text-red-700 dark:text-red-300 focus:bg-destructive/10 focus:text-red-700 dark:focus:text-red-300 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-red-700 dark:data-[highlighted]:text-red-300",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";
