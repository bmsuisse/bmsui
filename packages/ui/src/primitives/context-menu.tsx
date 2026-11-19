import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { CheckIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode, Ref } from "react";
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
  useLevelOption,
  useMenuLevel,
  useMenuOpen,
} from "../lib/menuCompat";
import { openState, slot } from "../lib/radixCompat";
import { cn } from "../lib/utils";

/**
 * ContextMenu: the menu that opens on right-click (and long-press on
 * touch) over `ContextMenuTrigger`. Same look as `DropdownMenu`. Never make it
 * the only way to reach an action: touch and keyboard users need a visible
 * control too (a "⋯" `DropdownMenu` with the same items).
 */
export function ContextMenu({
  onOpenChange,
  modal: _modal,
  dir: _dir,
  children,
}: {
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  dir?: "ltr" | "rtl";
  children?: ReactNode;
}) {
  const { rootProps, provide } = useMenuLevel(undefined, false, onOpenChange);
  return <ContextMenuPrimitive.Root {...rootProps}>{provide(children)}</ContextMenuPrimitive.Root>;
}

export const ContextMenuTrigger = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<"span"> & { asChild?: boolean; disabled?: boolean }
>(({ asChild, disabled = false, children, ...props }, ref) => {
  useLevelOption("disabled", disabled);
  return (
    <ContextMenuPrimitive.Trigger
      ref={ref as Ref<HTMLDivElement>}
      data-state={openState(useMenuOpen())}
      data-disabled={disabled ? "" : undefined}
      {...(props as ComponentPropsWithoutRef<"div">)}
      {...(asChild ? slot(true, children) : { render: <span />, children })}
    />
  );
});
ContextMenuTrigger.displayName = "ContextMenuTrigger";

export const ContextMenuGroup = MenuGroup;
export const ContextMenuPortal = MenuPortal;
export const ContextMenuSub = MenuSub;
export const ContextMenuRadioGroup = MenuRadioGroup;

const SURFACE =
  "z-50 min-w-[8rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-md border border-foreground/10 bg-popover p-1 text-popover-foreground shadow-md dark:border-border";
const ROW =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export const ContextMenuContent = forwardRef<
  HTMLDivElement,
  Omit<MenuContentProps, "side" | "sideOffset" | "align">
>(({ className, collisionPadding = 8, ...props }, ref) => (
  <MenuContent
    ref={ref}
    cssPrefix="context-menu"
    collisionPadding={collisionPadding}
    className={cn(SURFACE, className)}
    {...props}
  />
));
ContextMenuContent.displayName = "ContextMenuContent";

export const ContextMenuItem = forwardRef<HTMLDivElement, MenuItemProps & { danger?: boolean }>(
  ({ className, danger, ...props }, ref) => (
    <MenuItem
      ref={ref}
      className={cn(
        ROW,
        "px-2 py-1.5",
        danger && "text-red-700 dark:text-red-300 focus:bg-destructive/10 focus:text-red-700 dark:focus:text-red-300",
        className,
      )}
      {...props}
    />
  ),
);
ContextMenuItem.displayName = "ContextMenuItem";

export const ContextMenuCheckboxItem = forwardRef<HTMLDivElement, MenuCheckboxItemProps>(
  ({ className, ...props }, ref) => (
    <MenuCheckboxItem
      ref={ref}
      indicator={<CheckIcon className="h-4 w-4" />}
      className={cn(ROW, "py-1.5 pl-8 pr-2", className)}
      {...props}
    />
  ),
);
ContextMenuCheckboxItem.displayName = "ContextMenuCheckboxItem";

export const ContextMenuRadioItem = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof MenuRadioItem>, "indicator">
>(({ className, ...props }, ref) => (
  <MenuRadioItem
    ref={ref}
    indicator={<span className="h-2 w-2 rounded-full bg-current" />}
    className={cn(ROW, "py-1.5 pl-8 pr-2", className)}
    {...props}
  />
));
ContextMenuRadioItem.displayName = "ContextMenuRadioItem";

export const ContextMenuSeparator = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof MenuSeparator>>(
  ({ className, ...props }, ref) => (
    <MenuSeparator ref={ref} className={cn("-mx-1 my-1 h-px bg-foreground/10 dark:bg-border", className)} {...props} />
  ),
);
ContextMenuSeparator.displayName = "ContextMenuSeparator";

export const ContextMenuLabel = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof MenuLabel>>(
  ({ className, ...props }, ref) => (
    <MenuLabel ref={ref} className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />
  ),
);
ContextMenuLabel.displayName = "ContextMenuLabel";

export const ContextMenuShortcut = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto pl-4 text-xs tracking-widest text-muted-foreground", className)} {...props} />
);

export const ContextMenuSubTrigger = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof MenuSubTrigger>>(
  ({ className, children, ...props }, ref) => (
    <MenuSubTrigger
      ref={ref}
      className={cn(ROW, "px-2 py-1.5 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon aria-hidden="true" className="ml-auto h-4 w-4" />
    </MenuSubTrigger>
  ),
);
ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger";

export const ContextMenuSubContent = forwardRef<HTMLDivElement, Omit<MenuContentProps, "side" | "align">>(
  ({ className, collisionPadding = 8, ...props }, ref) => (
    <MenuContent
      ref={ref}
      cssPrefix="context-menu"
      collisionPadding={collisionPadding}
      className={cn(SURFACE, className)}
      {...props}
    />
  ),
);
ContextMenuSubContent.displayName = "ContextMenuSubContent";
