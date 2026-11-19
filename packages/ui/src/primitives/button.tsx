import { useRender } from "@base-ui/react/use-render";
import { type VariantProps, cva } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

/** Soft ring-coloured glow shared by the solid and subtle `ai` variants (stronger on hover). */
const AI_GLOW =
  "shadow-[0_0_0_1px_color-mix(in_oklab,var(--ring)_35%,transparent),0_0_16px_-2px_color-mix(in_oklab,var(--ring)_55%,transparent)] transition-shadow hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--ring)_55%,transparent),0_0_22px_-1px_color-mix(in_oklab,var(--ring)_70%,transparent)]";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        secondary: "bg-muted text-muted-foreground hover:bg-muted/80",
        link: "text-primary dark:text-ring underline-offset-4 hover:underline",
        // "Swiss design" red CTA, ported from akeneo_editor's old .btn-primary-swiss
        // naive-ui override. Relies on --color-swiss-primary/-hover and
        // --color-swiss-primary-foreground tokens defined by the consuming app's own
        // Tailwind theme (this package doesn't define them) — same pattern as AlertBox's
        // warning/info/success colors, which assume tokens the shared theme doesn't have.
        "swiss-primary":
          "bg-swiss-primary text-swiss-primary-foreground font-semibold shadow-sm hover:bg-swiss-primary-hover hover:-translate-y-px active:translate-y-px",
        "swiss-secondary":
          "border border-input bg-background font-semibold text-foreground shadow-sm hover:bg-accent hover:-translate-y-px active:translate-y-px",
        // "AI action" accent in the same three weights as default/outline/ghost: the theme's own
        // `--primary` / `--ring` plus a soft ring-coloured glow (no fixed hue, so it follows each
        // brand). The sparkle icon (AiButton) carries the "AI" signal. Dark `--primary` stays navy,
        // so the solid fill and the text use `--ring` there (see the dark-mode foreground trap).
        ai: `bg-primary text-primary-foreground dark:bg-ring dark:text-background ${AI_GLOW}`,
        "ai-subtle": `border border-transparent bg-ring/10 text-primary dark:text-ring ${AI_GLOW}`,
        "ai-ghost":
          "text-primary transition-shadow hover:bg-ring/10 hover:shadow-[0_0_16px_-2px_color-mix(in_oklab,var(--ring)_50%,transparent)] dark:text-ring",
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
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) =>
    // `render={<button />}` rather than the default tag: Base UI's default button gets `type="button"`, a plain one submits forms.
    useRender({
      render: asChild ? (children as ReactElement) : <button />,
      ref,
      props: { className: cn(buttonVariants({ variant, size, className })), ...props, ...(asChild ? {} : { children }) },
    }),
);
Button.displayName = "Button";
