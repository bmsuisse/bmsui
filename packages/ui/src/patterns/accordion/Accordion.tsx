import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useMergedRefs } from "../../hooks/useMergedRefs";
import { openState, slot, useControllable } from "../../lib/radixCompat";
import { cn } from "../../lib/utils";
import { panelVars } from "../../primitives/collapsible";

export type AccordionVariant = "plain" | "card";
type Orientation = "vertical" | "horizontal";

interface AccordionContextValue {
  variant: AccordionVariant;
  animated: boolean;
  open: string[];
  /** Radix `type="single"` without `collapsible`: the open item cannot be closed. */
  locked: boolean;
  orientation: Orientation;
  disabled?: boolean;
}

const AccordionContext = createContext<AccordionContextValue>({
  variant: "plain",
  animated: true,
  open: [],
  locked: false,
  orientation: "vertical",
});
const ItemContext = createContext<{ open: boolean; disabled?: boolean }>({ open: false });

type AccordionValueProps =
  | {
      type: "single";
      value?: string;
      defaultValue?: string;
      onValueChange?: (value: string) => void;
      /** Allow closing the open item. @default false */
      collapsible?: boolean;
    }
  | {
      type: "multiple";
      value?: string[];
      defaultValue?: string[];
      onValueChange?: (value: string[]) => void;
    };

export type AccordionProps = Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "dir"> &
  AccordionValueProps & {
    disabled?: boolean;
    /** Arrow-key axis. @default "vertical" */
    orientation?: Orientation;
    dir?: "ltr" | "rtl";
    asChild?: boolean;
    /** `plain` (default): hairlines between the items. `card`: one bordered box, divider between items. */
    variant?: AccordionVariant;
    /** Height and chevron transitions (instant under reduced motion either way). @default true */
    animated?: boolean;
  };

const asList = (value: string | string[] | undefined) =>
  value === undefined ? undefined : Array.isArray(value) ? value : value ? [value] : [];

/**
 * A stack of titled panels where the user opens one (`type="single"`, add
 * `collapsible` to allow closing it) or several (`type="multiple"`) at a time,
 * with the arrow/Home/End keyboard model of WAI-ARIA accordions.
 * Height animates with a grid-rows transition; closed panels stay mounted but
 * inert, so form state survives.
 */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      variant = "plain",
      animated = true,
      className,
      type,
      value: valueProp,
      defaultValue,
      onValueChange,
      orientation = "vertical",
      asChild,
      children,
      onKeyDown,
      ...rest
    },
    ref,
  ) => {
    const { collapsible, ...props } = rest as typeof rest & { collapsible?: boolean };
    const single = type === "single";
    const [open, setOpen] = useControllable(asList(valueProp), asList(defaultValue) ?? [], (next: string[]) =>
      (onValueChange as ((value: string | string[]) => void) | undefined)?.(single ? (next[0] ?? "") : next),
    );
    const locked = single && !collapsible;
    return (
      <AccordionContext.Provider value={{ variant, animated, open, locked, orientation, disabled: props.disabled }}>
        <AccordionPrimitive.Root
          ref={ref}
          value={open}
          multiple={!single}
          onValueChange={(next: string[]) => {
            if (!(locked && next.length === 0)) setOpen(next);
          }}
          data-slot="accordion"
          data-variant={variant}
          data-orientation={orientation}
          className={cn(
            "w-full",
            variant === "card" && "overflow-hidden rounded-lg border border-foreground/10 bg-background dark:border-border",
            className,
          )}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented) moveTriggerFocus(event, orientation, props.dir);
          }}
          {...props}
          {...slot(asChild, children)}
        />
      </AccordionContext.Provider>
    );
  },
);
Accordion.displayName = "Accordion";

// Base UI dropped the accordion's roving arrow keys (APG update); Radix had them and users expect them.
function moveTriggerFocus(event: KeyboardEvent<HTMLDivElement>, orientation: Orientation, dir?: "ltr" | "rtl") {
  const root = event.currentTarget;
  const triggers = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-slot=accordion-trigger]")).filter(
    (t) => t.closest("[data-slot=accordion]") === root && !t.disabled,
  );
  const index = triggers.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  const last = triggers.length - 1;
  const [back, forward] =
    orientation === "horizontal"
      ? dir === "rtl"
        ? ["ArrowRight", "ArrowLeft"]
        : ["ArrowLeft", "ArrowRight"]
      : ["ArrowUp", "ArrowDown"];
  const moves: Record<string, number> = {
    Home: 0,
    End: last,
    [back]: index === 0 ? last : index - 1,
    [forward]: index === last ? 0 : index + 1,
  };
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  triggers[next]?.focus();
}

const stateAttrs = ({ open, disabled }: { open: boolean; disabled?: boolean }, orientation: Orientation) => ({
  "data-state": openState(open),
  "data-disabled": disabled ? "" : undefined,
  "data-orientation": orientation,
});

export const AccordionItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> & { value: string; disabled?: boolean; asChild?: boolean }
>(({ className, value, disabled, asChild, children, ...props }, ref) => {
  const ctx = useContext(AccordionContext);
  const item = { open: ctx.open.includes(value), disabled: ctx.disabled || disabled };
  return (
    <ItemContext.Provider value={item}>
      <AccordionPrimitive.Item
        ref={ref}
        value={value}
        disabled={disabled}
        {...stateAttrs(item, ctx.orientation)}
        className={cn("border-b border-foreground/10 last:border-b-0 dark:border-border", className)}
        {...props}
        {...slot(asChild, children)}
      />
    </ItemContext.Provider>
  );
});
AccordionItem.displayName = "AccordionItem";

export interface AccordionTriggerProps extends ComponentPropsWithoutRef<"button"> {
  /** Leading icon or node before the title. */
  icon?: ReactNode;
  /** One muted line under the title. */
  description?: ReactNode;
  /** Right-aligned node before the chevron (a count, a badge). Not part of the toggle's click target semantics. */
  meta?: ReactNode;
}

export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, icon, description, meta, ...props }, ref) => {
    const { variant, animated, locked, orientation } = useContext(AccordionContext);
    const item = useContext(ItemContext);
    const attrs = stateAttrs(item, orientation);
    return (
      <AccordionPrimitive.Header className="m-0 flex" {...attrs}>
        <AccordionPrimitive.Trigger
          ref={ref}
          data-slot="accordion-trigger"
          aria-disabled={(locked && item.open) || undefined}
          {...attrs}
          className={cn(
            "group/acc flex min-h-11 w-full min-w-0 items-center gap-3 rounded-md py-3 text-left text-sm font-medium text-foreground outline-none hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:py-2.5",
            variant === "card" ? "rounded-none px-3" : "px-1",
            className,
          )}
          {...props}
        >
          {icon ? <span className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span> : null}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="min-w-0 break-words">{children}</span>
            {description ? (
              <span className="mt-0.5 min-w-0 break-words text-xs font-normal text-muted-foreground">{description}</span>
            ) : null}
          </span>
          {meta ? <span className="shrink-0 text-xs font-normal text-muted-foreground">{meta}</span> : null}
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground group-hover/acc:text-foreground group-data-[state=open]/acc:rotate-180",
              animated && "transition-[rotate,color] duration-200 ease-out motion-reduce:transition-none",
            )}
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    );
  },
);
AccordionTrigger.displayName = "AccordionTrigger";

/** `forceMount` is accepted for Radix compatibility; panels are always mounted. */
export type AccordionContentProps = ComponentPropsWithoutRef<"div"> & { forceMount?: boolean };

/** Keeps `inert` and `aria-hidden` in step with `data-state` (the panel stays mounted when closed). */
function useInertWhenClosed(): [(node: HTMLDivElement | null) => void] {
  const observer = useRef<MutationObserver | null>(null);
  const attach = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const sync = (): void => {
      const closed = node.getAttribute("data-state") === "closed";
      node.toggleAttribute("inert", closed);
      if (closed) node.setAttribute("aria-hidden", "true");
      else node.removeAttribute("aria-hidden");
    };
    sync();
    if (typeof MutationObserver === "undefined") return;
    observer.current = new MutationObserver(sync);
    observer.current.observe(node, { attributes: true, attributeFilter: ["data-state"] });
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return [attach];
}

export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, style, forceMount: _forceMount, ...props }, ref) => {
    const { variant, animated, orientation } = useContext(AccordionContext);
    const item = useContext(ItemContext);
    const [attach] = useInertWhenClosed();
    const mergedRef = useMergedRefs(attach, ref);
    return (
      <AccordionPrimitive.Panel
        keepMounted
        // Closed panels stay laid out (0fr grid row) for the height transition; Base UI would add `hidden`.
        hidden={false}
        ref={mergedRef}
        {...stateAttrs(item, orientation)}
        style={{ ...panelVars("accordion"), ...style }}
        className={cn(
          "group/accc grid grid-rows-[0fr] overflow-hidden text-sm data-[state=open]:grid-rows-[1fr]",
          animated && "transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
        )}
        {...props}
      >
        <div
          className={cn(
            "min-h-0",
            animated &&
              "transition-opacity duration-200 ease-out group-data-[state=closed]/accc:opacity-0 group-data-[state=closed]/accc:duration-150 group-data-[state=closed]/accc:ease-in motion-reduce:transition-none",
          )}
        >
          <div className={cn("pb-3 pt-0.5", variant === "card" ? "px-3" : "px-1", className)}>{children}</div>
        </div>
      </AccordionPrimitive.Panel>
    );
  },
);
AccordionContent.displayName = "AccordionContent";
