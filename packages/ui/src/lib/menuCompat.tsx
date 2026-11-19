import { Menu } from "@base-ui/react/menu";
import type { BaseUIEvent } from "@base-ui/react/types";
import { useRender } from "@base-ui/react/use-render";
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useContext,
  useState,
} from "react";
import {
  checkedState,
  DismissProvider,
  useAutoFocus,
  openState,
  type RadixDismissProps,
  type RadixFocusProps,
  type RadixPositionProps,
  radixVars,
  slot,
  splitPosition,
  useControllable,
  useDismissBridge,
  useDismissCallbacks,
} from "./radixCompat";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

// Radix's DropdownMenu/ContextMenu API on Base UI's Menu, shared by both primitives (ui 0.32.0).

interface LevelOptions {
  loop: boolean;
  disabled: boolean;
}
interface Level {
  open: boolean;
  setOptions: (update: (options: LevelOptions) => LevelOptions) => void;
}
const LevelContext = createContext<Level>({ open: false, setOptions: () => {} });

/** Open state of a menu or submenu; parts below read it for Radix's `data-state`. */
export function useMenuLevel(open: boolean | undefined, defaultOpen = false, onOpenChange?: (open: boolean) => void) {
  const [isOpen, setOpen] = useControllable(open, defaultOpen, onOpenChange);
  const dismiss = useDismissBridge((next: boolean, _details: { reason: string; event: Event; cancel: () => void }) =>
    setOpen(next),
  );
  const [options, setOptions] = useState<LevelOptions>({ loop: false, disabled: false });
  return {
    rootProps: { open: isOpen, onOpenChange: dismiss.onOpenChange, loopFocus: options.loop, disabled: options.disabled },
    provide: (children: ReactNode) => (
      <DismissProvider value={dismiss.ref}>
        <LevelContext.Provider value={{ open: isOpen, setOptions }}>{children}</LevelContext.Provider>
      </DismissProvider>
    ),
  };
}

export const useMenuOpen = () => useContext(LevelContext).open;

/** Radix put `loop` on the content and `disabled` on the context trigger; Base UI wants both on the root. */
export function useLevelOption<K extends keyof LevelOptions>(key: K, value: LevelOptions[K]) {
  const { setOptions } = useContext(LevelContext);
  useIsomorphicLayoutEffect(
    () => setOptions((options) => (options[key] === value ? options : { ...options, [key]: value })),
    [key, value, setOptions],
  );
}

type PortalOptions = { container?: HTMLElement | null; forceMount?: true };
const PortalContext = createContext<PortalOptions>({});

/** The content parts portal themselves; this only hands them `container` / `forceMount`. */
export function MenuPortal({ children, ...options }: PortalOptions & { children?: ReactNode }) {
  return <PortalContext.Provider value={options}>{children}</PortalContext.Provider>;
}

export type MenuContentProps = ComponentPropsWithoutRef<"div"> &
  RadixPositionProps &
  RadixDismissProps &
  Pick<RadixFocusProps, "onCloseAutoFocus"> & { loop?: boolean; forceMount?: true };

export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps & { cssPrefix: string }>(
  (
    {
      cssPrefix,
      loop = false,
      forceMount,
      onCloseAutoFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      ...props
    },
    ref,
  ) => {
    const open = useMenuOpen();
    const portal = useContext(PortalContext);
    useLevelOption("loop", loop);
  useDismissCallbacks({ onEscapeKeyDown, onPointerDownOutside, onFocusOutside, onInteractOutside });
    const autoFocus = useAutoFocus({ onCloseAutoFocus }, ref);
    const { position, rest } = splitPosition(props);
    return (
      <Menu.Portal container={portal.container} keepMounted={forceMount ?? portal.forceMount}>
        <Menu.Positioner {...position} style={radixVars(cssPrefix)}>
          <Menu.Popup data-state={openState(open)} {...autoFocus} {...rest} />
        </Menu.Positioner>
      </Menu.Portal>
    );
  },
);
MenuContent.displayName = "MenuContent";

type ClickEvent = BaseUIEvent<MouseEvent<HTMLDivElement>>;
type ItemBase = Omit<ComponentPropsWithoutRef<"div">, "onSelect"> & {
  disabled?: boolean;
  /** Radix: runs on click / Enter; `event.preventDefault()` keeps the menu open. */
  onSelect?: (event: Event) => void;
  textValue?: string;
};

// Radix order: the item's onClick, then a cancelable "menu.itemSelect" on the item, then the toggle.
function selectOnClick(onClick: ItemBase["onClick"], onSelect: ItemBase["onSelect"], toggle?: () => void) {
  return (event: ClickEvent) => {
    onClick?.(event);
    if (event.defaultPrevented) return event.preventBaseUIHandler();
    const select = new CustomEvent("menu.itemSelect", { bubbles: true, cancelable: true });
    if (onSelect) event.currentTarget.addEventListener("menu.itemSelect", onSelect, { once: true });
    event.currentTarget.dispatchEvent(select);
    toggle?.();
    if (select.defaultPrevented) event.preventBaseUIHandler();
  };
}

export type MenuItemProps = ItemBase & { asChild?: boolean };

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ asChild, children, onClick, onSelect, textValue, ...props }, ref) => (
    <Menu.Item
      ref={ref}
      label={textValue}
      onClick={selectOnClick(onClick, onSelect)}
      {...props}
      {...slot(asChild, children)}
    />
  ),
);
MenuItem.displayName = "MenuItem";

const indicatorBox = "absolute left-2 flex h-3.5 w-3.5 items-center justify-center";

export type MenuCheckboxItemProps = ItemBase & {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
};

export const MenuCheckboxItem = forwardRef<HTMLDivElement, MenuCheckboxItemProps & { indicator: ReactNode }>(
  ({ indicator, checked = false, onCheckedChange, children, onClick, onSelect, textValue, ...props }, ref) => (
    <Menu.CheckboxItem
      ref={ref}
      label={textValue}
      checked={checked === true}
      closeOnClick
      aria-checked={checked === "indeterminate" ? "mixed" : checked}
      data-state={checkedState(checked)}
      onClick={selectOnClick(onClick, onSelect, () => onCheckedChange?.(checked === "indeterminate" || !checked))}
      {...props}
    >
      <span className={indicatorBox}>{checked !== false && <span data-state={checkedState(checked)}>{indicator}</span>}</span>
      {children}
    </Menu.CheckboxItem>
  ),
);
MenuCheckboxItem.displayName = "MenuCheckboxItem";

const RadioContext = createContext<{ value?: string; onValueChange?: (value: string) => void }>({});

export const MenuRadioGroup = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<"div">, "defaultValue"> & {
    value?: string;
    onValueChange?: (value: string) => void;
    asChild?: boolean;
  }
>(({ value, onValueChange, asChild, children, ...props }, ref) => (
  <RadioContext.Provider value={{ value, onValueChange }}>
    {/* Kept controlled: Radix's group never changes its own value. */}
    <Menu.RadioGroup ref={ref} value={value ?? null} {...props} {...slot(asChild, children)} />
  </RadioContext.Provider>
));
MenuRadioGroup.displayName = "MenuRadioGroup";

export const MenuRadioItem = forwardRef<HTMLDivElement, ItemBase & { value: string; indicator: ReactNode }>(
  ({ indicator, value, children, onClick, onSelect, textValue, ...props }, ref) => {
    const group = useContext(RadioContext);
    const checked = group.value === value;
    return (
      <Menu.RadioItem
        ref={ref}
        value={value}
        label={textValue}
        closeOnClick
        data-state={checkedState(checked)}
        onClick={selectOnClick(onClick, onSelect, () => group.onValueChange?.(value))}
        {...props}
      >
        <span className={indicatorBox}>{checked && <span data-state="checked">{indicator}</span>}</span>
        {children}
      </Menu.RadioItem>
    );
  },
);
MenuRadioItem.displayName = "MenuRadioItem";

export function MenuSub({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  const { rootProps, provide } = useMenuLevel(open, defaultOpen, onOpenChange);
  return <Menu.SubmenuRoot {...rootProps}>{provide(children)}</Menu.SubmenuRoot>;
}

export const MenuSubTrigger = forwardRef<HTMLDivElement, Omit<ItemBase, "onSelect">>(({ textValue, ...props }, ref) => (
  <Menu.SubmenuTrigger ref={ref} label={textValue} data-state={openState(useMenuOpen())} {...props} />
));
MenuSubTrigger.displayName = "MenuSubTrigger";

type PartProps = ComponentPropsWithoutRef<"div"> & { asChild?: boolean };

export const MenuGroup = forwardRef<HTMLDivElement, PartProps>(({ asChild, children, ...props }, ref) => (
  <Menu.Group ref={ref} {...props} {...slot(asChild, children)} />
));
MenuGroup.displayName = "MenuGroup";

export const MenuSeparator = forwardRef<HTMLDivElement, PartProps>(({ asChild, children, ...props }, ref) => (
  <Menu.Separator ref={ref} {...props} {...slot(asChild, children)} />
));
MenuSeparator.displayName = "MenuSeparator";

/** A plain caption like Radix's (Base UI's GroupLabel only works inside a Group). */
export const MenuLabel = forwardRef<HTMLDivElement, PartProps>(({ asChild, children, ...props }, ref) =>
  useRender({
    defaultTagName: "div",
    render: asChild ? (children as ReactElement) : undefined,
    ref,
    props: asChild ? props : { ...props, children },
  }),
);
MenuLabel.displayName = "MenuLabel";
