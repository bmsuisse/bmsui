import { Menu } from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import {
  MenuCheckboxItem,
  type MenuCheckboxItemProps,
  MenuContent,
  type MenuContentProps,
  MenuGroup,
  MenuItem,
  type MenuItemProps,
  MenuLabel,
  MenuPortal,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
  useMenuLevel,
  useMenuOpen,
} from "../lib/menuCompat";
import { openState, slot } from "../lib/radixCompat";
import { cn } from "../lib/utils";

export function DropdownMenu({
  open,
  defaultOpen,
  onOpenChange,
  modal = true,
  dir: _dir,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  dir?: "ltr" | "rtl";
  children?: ReactNode;
}) {
  const { rootProps, provide } = useMenuLevel(open, defaultOpen, onOpenChange);
  return (
    <Menu.Root {...rootProps} modal={modal}>
      {provide(children)}
    </Menu.Root>
  );
}

export const DropdownMenuTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => (
  <Menu.Trigger
    ref={ref}
    data-state={openState(useMenuOpen())}
    {...props}
    {...slot(asChild, children, { button: true })}
  />
));
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuGroup = MenuGroup;
export const DropdownMenuPortal = MenuPortal;
export const DropdownMenuSub = MenuSub;
export const DropdownMenuRadioGroup = MenuRadioGroup;

export const DropdownMenuContent = forwardRef<HTMLDivElement, MenuContentProps>(
  ({ className, sideOffset = 4, collisionPadding = 8, ...props }, ref) => (
    <MenuContent
      ref={ref}
      cssPrefix="dropdown-menu"
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = forwardRef<HTMLDivElement, MenuItemProps & { danger?: boolean }>(
  ({ className, danger, ...props }, ref) => (
    <MenuItem
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        danger && "text-red-700 dark:text-red-300 focus:bg-destructive/10 focus:text-red-700 dark:focus:text-red-300",
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuCheckboxItem = forwardRef<HTMLDivElement, MenuCheckboxItemProps>(
  ({ className, ...props }, ref) => (
    <MenuCheckboxItem
      ref={ref}
      indicator={<CheckIcon className="h-4 w-4" />}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export const DropdownMenuRadioItem = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof MenuRadioItem>, "indicator">
>(({ className, ...props }, ref) => (
  <MenuRadioItem
    ref={ref}
    indicator={<span className="h-2 w-2 rounded-full bg-current" />}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  />
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

export const DropdownMenuSeparator = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof MenuSeparator>>(
  ({ className, ...props }, ref) => (
    <MenuSeparator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
  ),
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export const DropdownMenuLabel = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof MenuLabel>>(
  ({ className, ...props }, ref) => (
    <MenuLabel ref={ref} className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />
  ),
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuShortcut = ({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />
);

export const DropdownMenuSubTrigger = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof MenuSubTrigger>>(
  ({ className, children, ...props }, ref) => (
    <MenuSubTrigger
      ref={ref}
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto h-4 w-4" />
    </MenuSubTrigger>
  ),
);
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

export const DropdownMenuSubContent = forwardRef<
  HTMLDivElement,
  Omit<MenuContentProps, "side" | "align">
>(({ className, ...props }, ref) => (
  <MenuContent
    ref={ref}
    cssPrefix="dropdown-menu"
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";
