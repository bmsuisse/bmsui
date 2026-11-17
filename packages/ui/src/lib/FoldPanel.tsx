import { type ReactElement, type ReactNode, useEffect, useRef } from "react";
import { CollapsibleContent } from "../primitives/collapsible";
import { cn } from "./utils";

/**
 * Internal: the height transition `CollapsibleSection` uses (grid rows 0fr→1fr, content fades,
 * `inert` while closed), without its header. Must sit inside a Radix `Collapsible`.
 */
export const FoldPanel = ({
  open,
  children,
  className,
  innerClassName,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.toggleAttribute("inert", !open);
  }, [open]);
  return (
    <CollapsibleContent
      forceMount
      ref={ref}
      aria-hidden={!open || undefined}
      className={cn(
        "group/fp grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out data-[state=open]:grid-rows-[1fr] motion-reduce:transition-none",
        className,
      )}
    >
      <div
        className={cn(
          "min-h-0 transition-opacity duration-200 ease-out group-data-[state=closed]/fp:opacity-0 group-data-[state=closed]/fp:duration-150 group-data-[state=closed]/fp:ease-in motion-reduce:transition-none",
          innerClassName,
        )}
      >
        {children}
      </div>
    </CollapsibleContent>
  );
};
