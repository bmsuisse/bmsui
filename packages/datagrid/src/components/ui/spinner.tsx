import type { SVGAttributes } from "react";
import { cn } from "../../lib/utils";

/** The BMS bullseye: a muted ring with a pulsing brand-colored core. Size via `className` (e.g. `h-6 w-6`), same convention as this package's other icon usages. */
export function Spinner({ className, ...props }: SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8.5" strokeWidth="3" className="stroke-muted-foreground" />
      <circle cx="12" cy="12" r="3.2" className="animate-pulse fill-primary" />
    </svg>
  );
}
