import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../primitives/collapsible";

export interface CollapsibleSectionProps {
  title: ReactNode;
  /** Number shown in a pill after the title (items inside, open tasks…). `0` is shown; omit to hide. */
  count?: number;
  /** One muted line under the title. */
  description?: ReactNode;
  /** Buttons on the right of the header, outside the toggle (they don't open/close it). */
  actions?: ReactNode;
  children: ReactNode;
  /** Uncontrolled initial state. @default true */
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** `plain` (default): header + content, no frame. `card`: bordered box, divider under the header. */
  variant?: "plain" | "card";
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  "data-testid"?: string;
}

/**
 * A titled section the user can fold away: chevron, title, optional count and
 * actions, with a smooth height transition (CSS grid rows, no measuring, no
 * animation plugin; content fades with it and the chevron rotates, 200ms ease-out;
 * instant under reduced motion). Use it for secondary blocks
 * on detail pages and in side panels ("Attachments (3)", "History"). Closed
 * content stays mounted (so form state survives) but is inert.
 */
export const CollapsibleSection = ({
  title,
  count,
  description,
  actions,
  children,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  variant = "plain",
  disabled,
  className,
  contentClassName,
  "data-testid": testId = "collapsible-section",
}: CollapsibleSectionProps): ReactElement => {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const setOpen = (next: boolean): void => {
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };
  // `inert` keeps Tab out of the folded content; set on the node because React 18 and 19 disagree on its prop type.
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentRef.current?.toggleAttribute("inert", !open);
  }, [open]);
  const card = variant === "card";
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      data-testid={testId}
      className={cn(card && "rounded-lg border border-foreground/10 bg-background dark:border-border", className)}
    >
      <div className={cn("flex items-center gap-2", card ? "px-3 py-2.5" : "py-1.5")}>
        <CollapsibleTrigger
          data-testid={`${testId}-trigger`}
          className={cn(
            "group/cs -mx-1 flex min-w-0 flex-1 items-start gap-1.5 rounded-md px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <ChevronRightIcon
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-[rotate,color] duration-200 ease-out group-hover/cs:text-foreground group-disabled/cs:text-muted-foreground group-data-[state=open]/cs:rotate-90 motion-reduce:transition-none"
          />
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{title}</span>
              {count != null ? (
                <span
                  data-testid={`${testId}-count`}
                  className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-foreground/[0.07] px-1.5 text-[11px] font-medium leading-none tabular-nums text-muted-foreground dark:bg-foreground/10"
                >
                  {count}
                </span>
              ) : null}
            </span>
            {description ? <span className="mt-0.5 truncate text-xs text-muted-foreground">{description}</span> : null}
          </span>
        </CollapsibleTrigger>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
      <CollapsibleContent
        forceMount
        ref={contentRef}
        aria-hidden={!open || undefined}
        className="group/csc grid grid-rows-[0fr] overflow-hidden transition-[grid-template-rows] duration-200 ease-out data-[state=open]:grid-rows-[1fr] motion-reduce:transition-none"
      >
        {/* Content fades with the height: in ease-out, out ease-in (a touch faster, so it
            is gone before the box finishes closing). */}
        <div className="min-h-0 transition-opacity duration-200 ease-out group-data-[state=closed]/csc:opacity-0 group-data-[state=closed]/csc:duration-150 group-data-[state=closed]/csc:ease-in motion-reduce:transition-none">
          <div className={cn(// Plain: indent 22px (16px chevron + 6px gap) so content lines up with the title.
            card ? "border-t border-foreground/10 px-3 py-3 dark:border-border" : "pb-2 pl-[22px] pt-1", contentClassName)}>
            {children}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
