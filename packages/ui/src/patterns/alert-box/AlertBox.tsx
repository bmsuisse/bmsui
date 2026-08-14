import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type AlertBoxVariant = "error" | "warning" | "info" | "success";

export interface AlertBoxProps {
  /** Determines the color scheme and the default icon. */
  variant: AlertBoxVariant;
  /** Optional bold heading line shown above the body content. */
  title?: string;
  /** Body text/content. Always rendered. */
  children: ReactNode;
  className?: string;
  /**
   * Overrides the default variant icon entirely. Pass `null` to hide the
   * icon. Defaults to a variant-specific lucide-react icon.
   */
  icon?: ReactNode;
}

// `error` reuses the shared `destructive` theme token, matching the banner
// pattern already used elsewhere. `warning`/`info`/`success` have no equivalent tokens
// in @bmsuisse/ui's theme (it only defines background/foreground/primary/muted/
// popover/accent/destructive/border/input/ring), so these three variants use
// fixed Tailwind palette colors instead of theme tokens. A consumer app with
// different brand colors will need to override these via `className`.
const variantStyles: Record<AlertBoxVariant, string> = {
  error: "border-destructive bg-destructive/10 text-destructive",
  warning: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  info: "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  success: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const defaultIcons: Record<AlertBoxVariant, ReactElement> = {
  error: <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  info: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
  success: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
};

export const AlertBox = ({ variant, title, children, className, icon }: AlertBoxProps): ReactElement => {
  const resolvedIcon = icon === undefined ? defaultIcons[variant] : icon;

  return (
    <div className={cn("rounded-md border p-3 text-sm", variantStyles[variant], className)}>
      <div className="flex flex-row items-start gap-2">
        {resolvedIcon != null && <span className="mt-0.5 shrink-0">{resolvedIcon}</span>}
        <div className="flex flex-col gap-1">
          {title && <p className="font-bold">{title}</p>}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
};
