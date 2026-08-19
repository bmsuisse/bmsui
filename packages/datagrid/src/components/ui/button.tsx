import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2 text-xs",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // `buttonVariants` (via `cva`) already appends `className` itself —
    // through plain `clsx` concatenation, not `twMerge` — so it's already
    // present in `variantClass` below; the separate `cn()` call exists only
    // to resolve conflicts between it and the variant/size classes (e.g. a
    // caller overriding the default `h-9`). Skipping that resolution pass
    // entirely when there's no `className` to conflict with matters here
    // specifically because `<DataGrid>` renders a `<Button>` per visible row
    // (the expand toggle, the row-actions trigger) with no `className` of
    // its own — every scroll-triggered re-render was paying for a full
    // clsx+twMerge parse of an already-final, already-conflict-free string.
    const variantClass = buttonVariants({ variant, size });
    return (
      <Comp className={className ? cn(variantClass, className) : variantClass} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";
