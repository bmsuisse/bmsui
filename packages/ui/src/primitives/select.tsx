import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { openState, type RadixPositionProps, radixVars, slot, splitPosition, useControllable } from "../lib/radixCompat";
import { cn } from "../lib/utils";

type Labels = ReadonlyMap<string, ReactNode>;
type SetLabel = (value: string, label: ReactNode | undefined) => void;

const SelectContext = createContext<{ open: boolean; value: string | undefined; labels: Labels } | null>(null);
const RegisterContext = createContext<SetLabel>(() => {});
// True inside the hidden copy of the items that collects their labels while the popup is closed.
const CollectContext = createContext(false);

const useSelect = () => {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select parts must be inside <Select>");
  return ctx;
};

export function Select({
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  form?: string;
  autoComplete?: string;
  children?: ReactNode;
}) {
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange as (v: string | undefined) => void);
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  const [labels, setLabels] = useState<Labels>(() => new Map());
  const setLabel = useCallback<SetLabel>((key, label) => {
    setLabels((prev) => {
      if (prev.get(key) === label && (label !== undefined || !prev.has(key))) return prev;
      const next = new Map(prev);
      if (label === undefined) next.delete(key);
      else next.set(key, label);
      return next;
    });
  }, []);
  return (
    <SelectPrimitive.Root<string>
      value={value ?? null}
      onValueChange={(next) => next != null && setValue(next)}
      open={open}
      onOpenChange={(next) => setOpen(next)}
      {...props}
    >
      <RegisterContext.Provider value={setLabel}>
        <SelectContext.Provider value={{ open, value, labels }}>{children}</SelectContext.Provider>
      </RegisterContext.Provider>
    </SelectPrimitive.Root>
  );
}

export const SelectGroup = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>((props, ref) =>
  useContext(CollectContext) ? <>{props.children}</> : <SelectPrimitive.Group ref={ref} {...props} />,
);
SelectGroup.displayName = "SelectGroup";

/** Shows the selected item's text (Radix semantics), or `placeholder` when nothing is selected. */
export const SelectValue = forwardRef<
  HTMLSpanElement,
  Omit<ComponentPropsWithoutRef<"span">, "children"> & { placeholder?: ReactNode; children?: ReactNode }
>(({ placeholder, children, ...props }, ref) => {
  const { labels } = useSelect();
  return (
    <SelectPrimitive.Value ref={ref} {...props}>
      {children ?? ((value: string | null) => (value == null || value === "" ? placeholder : (labels.get(value) ?? value)))}
    </SelectPrimitive.Value>
  );
});
SelectValue.displayName = "SelectValue";

export interface SelectTriggerProps extends ComponentPropsWithoutRef<"button"> {
  size?: "sm" | "default";
  asChild?: boolean;
}

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, size = "default", asChild, ...props }, ref) => {
    const { open } = useSelect();
    return (
      <SelectPrimitive.Trigger
        ref={ref}
        data-state={openState(open)}
        className={cn(
          "flex w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring aria-invalid:border-destructive aria-invalid:focus:ring-destructive disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8" : "h-9",
          className,
        )}
        {...props}
        {...(asChild
          ? slot(asChild, children, { button: true })
          : {
              children: (
                <>
                  {children}
                  <SelectPrimitive.Icon render={<ChevronDownIcon className="h-4 w-4 opacity-50" />} />
                </>
              ),
            })}
      />
    );
  },
);
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> &
    RadixPositionProps & {
      position?: "popper" | "item-aligned";
      container?: HTMLElement | null;
    }
>(({ className, children, position = "popper", container, ...props }, ref) => {
  const { open } = useSelect();
  const { position: placement, rest } = splitPosition(props);
  return (
    <>
      <LabelCollector>{children}</LabelCollector>
      <SelectPrimitive.Portal container={container}>
        <SelectPrimitive.Positioner
          {...placement}
          alignItemWithTrigger={position === "item-aligned"}
          className="z-50"
          style={radixVars("select")}
        >
          <SelectPrimitive.Popup
            ref={ref}
            data-state={openState(open)}
            className={cn(
              "relative z-50 flex max-h-96 min-w-[8rem] flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
              position === "popper" && "translate-y-1",
              className,
            )}
            {...rest}
          >
            <SelectPrimitive.List
              className={cn(
                "overflow-y-auto p-1",
                position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]",
              )}
            >
              {children}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </>
  );
});
SelectContent.displayName = "SelectContent";

/**
 * Base UI mounts the items only while the popup is open, so <SelectValue> would show the raw value.
 * Like Radix, render them once more into a detached fragment where they only report their labels.
 */
function LabelCollector({ children }: { children: ReactNode }) {
  const [fragment] = useState(() => (typeof document === "undefined" ? null : document.createDocumentFragment()));
  if (!fragment) return null;
  return createPortal(<CollectContext.Provider value>{children}</CollectContext.Provider>, fragment);
}

type SelectItemProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  value: string;
  disabled?: boolean;
  textValue?: string;
  children?: ReactNode;
};

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>((props, ref) =>
  useContext(CollectContext) ? (
    <CollectedItem value={props.value} label={props.children} />
  ) : (
    <SelectItemView ref={ref} {...props} />
  ),
);
SelectItem.displayName = "SelectItem";

function CollectedItem({ value, label }: { value: string; label: ReactNode }) {
  const setLabel = useContext(RegisterContext);
  useLayoutEffect(() => {
    setLabel(value, label);
    return () => setLabel(value, undefined);
  }, [setLabel, value, label]);
  return null;
}

const SelectItemView = forwardRef<HTMLDivElement, SelectItemProps>(({ className, children, textValue, ...props }, ref) => {
  const { value } = useSelect();
  return (
    <SelectPrimitive.Item
      ref={ref}
      label={textValue}
      data-state={value === props.value ? "checked" : "unchecked"}
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
  );
});
SelectItemView.displayName = "SelectItemView";
