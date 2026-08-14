import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        secondary: "bg-muted text-muted-foreground hover:bg-muted/80",
        link: "text-primary underline-offset-4 hover:underline",
        // "Swiss design" red CTA, ported from akeneo_editor's old .btn-primary-swiss
        // naive-ui override. Relies on --color-swiss-primary/-hover and
        // --color-swiss-primary-foreground tokens defined by the consuming app's own
        // Tailwind theme (this package doesn't define them) — same pattern as AlertBox's
        // warning/info/success colors, which assume tokens the shared theme doesn't have.
        "swiss-primary":
          "bg-swiss-primary text-swiss-primary-foreground font-semibold shadow-sm hover:bg-swiss-primary-hover hover:-translate-y-px active:translate-y-px",
        "swiss-secondary":
          "border border-input bg-background font-semibold text-foreground shadow-sm hover:bg-accent hover:-translate-y-px active:translate-y-px",
      },
      size: {
        default: "h-9 px-3",
        xs: "h-7 px-2 text-xs",
        sm: "h-8 px-2 text-xs",
        lg: "h-10 px-4",
        icon: "h-9 w-9",
        "icon-xs": "h-7 w-7",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-10 w-10",
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
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";
