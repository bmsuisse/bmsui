import { type VariantProps, cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

export const loadingSpinnerIconVariants = cva("animate-spin text-muted-foreground", {
  variants: {
    size: {
      sm: "h-3.5 w-3.5",
      default: "h-4 w-4",
      lg: "h-6 w-6",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface LoadingSpinnerProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof loadingSpinnerIconVariants> {
  /** Optional text rendered next to the spinner. Omitted entirely renders an icon-only spinner. */
  label?: string;
}

/** Inline loading indicator: a spinning icon with an optional label, e.g. `<LoadingSpinner label="Saving…" />`. */
export const LoadingSpinner = ({
  size,
  label,
  className,
  ...props
}: LoadingSpinnerProps): ReactElement => (
  <span role="status" className={cn("inline-flex items-center gap-2", className)} {...props}>
    <Loader2 className={cn(loadingSpinnerIconVariants({ size }))} aria-hidden="true" />
    {label ? <span>{label}</span> : null}
  </span>
);

export interface LoadingOverlayProps
  extends HTMLAttributes<HTMLDivElement>,
    Pick<LoadingSpinnerProps, "label"> {
  size?: LoadingSpinnerProps["size"];
}

/** Centers a larger `LoadingSpinner` inside a full container/page — use as a route or panel loading state. */
export const LoadingOverlay = ({
  size = "lg",
  label,
  className,
  ...props
}: LoadingOverlayProps): ReactElement => (
  <div
    className={cn("flex h-full min-h-32 w-full items-center justify-center", className)}
    {...props}
  >
    <LoadingSpinner size={size} label={label} />
  </div>
);
