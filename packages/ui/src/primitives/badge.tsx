import { type VariantProps, cva } from "class-variance-authority";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-muted text-muted-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-input text-foreground",
        // Amber warning tone — same fixed-palette choice as AlertBox/StatusBadge's
        // warning tone, since the shared theme has no warning token yet.
        warning: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps): ReactElement => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
