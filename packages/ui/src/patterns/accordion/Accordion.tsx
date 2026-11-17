import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ElementRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { cn } from "../../lib/utils";

export type AccordionVariant = "plain" | "card";

interface AccordionContextValue {
  variant: AccordionVariant;
  animated: boolean;
}

const AccordionContext = createContext<AccordionContextValue>({ variant: "plain", animated: true });

export type AccordionProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & {
  /** `plain` (default): hairlines between the items. `card`: one bordered box, divider between items. */
  variant?: AccordionVariant;
  /** Height and chevron transitions (instant under reduced motion either way). @default true */
  animated?: boolean;
};

/**
 * A stack of titled panels where the user opens one (`type="single"`, add
 * `collapsible` to allow closing it) or several (`type="multiple"`) at a time,
 * with the arrow/Home/End keyboard model of WAI-ARIA accordions (Radix).
 * Height animates with a grid-rows transition; closed panels stay mounted but
 * inert, so form state survives.
 */
export const Accordion = forwardRef<ElementRef<typeof AccordionPrimitive.Root>, AccordionProps>(
  ({ variant = "plain", animated = true, className, ...props }, ref) => (
    <AccordionContext.Provider value={{ variant, animated }}>
      <AccordionPrimitive.Root
        ref={ref}
        data-variant={variant}
        className={cn(
          "w-full",
          variant === "card" && "overflow-hidden rounded-lg border border-foreground/10 bg-background dark:border-border",
          className,
        )}
        {...(props as ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>)}
      />
    </AccordionContext.Provider>
  ),
);
Accordion.displayName = "Accordion";

export const AccordionItem = forwardRef<
  ElementRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b border-foreground/10 last:border-b-0 dark:border-border", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

export interface AccordionTriggerProps extends ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  /** Leading icon or node before the title. */
  icon?: ReactNode;
  /** One muted line under the title. */
  description?: ReactNode;
  /** Right-aligned node before the chevron (a count, a badge). Not part of the toggle's click target semantics. */
  meta?: ReactNode;
}

export const AccordionTrigger = forwardRef<ElementRef<typeof AccordionPrimitive.Trigger>, AccordionTriggerProps>(
  ({ className, children, icon, description, meta, ...props }, ref) => {
    const { variant, animated } = useContext(AccordionContext);
    return (
      <AccordionPrimitive.Header className="m-0 flex">
        <AccordionPrimitive.Trigger
          ref={ref}
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

export type AccordionContentProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>;

/** Keeps `inert` and `aria-hidden` in step with Radix's `data-state` (the panel stays mounted when closed). */
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

export const AccordionContent = forwardRef<ElementRef<typeof AccordionPrimitive.Content>, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const { variant, animated } = useContext(AccordionContext);
    const [attach] = useInertWhenClosed();
    return (
      <AccordionPrimitive.Content
        forceMount
        ref={(node) => {
          attach(node);
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
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
      </AccordionPrimitive.Content>
    );
  },
);
AccordionContent.displayName = "AccordionContent";
