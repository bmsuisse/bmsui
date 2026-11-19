import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { forwardRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";

/** Pass `items` (value + label) so the trigger shows the selected item's label, not its value. */
export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  HTMLButtonElement,
  Omit<SelectPrimitive.Trigger.Props, "className"> & { className?: string }
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring aria-invalid:border-destructive aria-invalid:focus:ring-destructive disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon render={<ChevronDownIcon className="h-4 w-4 opacity-50" />} />
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export function SelectContent({ children }: { children?: ReactNode }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner alignItemWithTrigger={false} sideOffset={4} collisionPadding={8} className="z-50">
        <SelectPrimitive.Popup className="relative max-h-96 min-w-[8rem] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
          <SelectPrimitive.List className="p-1">{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export const SelectItem = forwardRef<
  HTMLDivElement,
  Omit<SelectPrimitive.Item.Props, "className"> & { className?: string }
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
