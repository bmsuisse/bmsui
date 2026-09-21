import { Sparkles } from "lucide-react";
import type { ElementType } from "react";
import { forwardRef } from "react";
import { Button, type ButtonProps } from "../../primitives/button";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";
import type { NavIconProps } from "../sidebar/NavItem";

/** The three `buttonVariants` entries that carry the violet AI accent. */
export type AiButtonVariant = "ai" | "ai-subtle" | "ai-ghost";

export interface AiButtonProps extends Omit<ButtonProps, "variant"> {
  /** `ai` = solid CTA, `ai-subtle` = tinted chip, `ai-ghost` = inline text action. @default "ai-subtle" */
  variant?: AiButtonVariant;
  /** Swaps the leading icon for a spinner and disables the button while an AI call is in flight. */
  loading?: boolean;
  /** Leading icon. @default Sparkles */
  icon?: ElementType<NavIconProps>;
}

/**
 * The "do something with AI" button: sparkle icon plus a built-in in-flight
 * state on top of `Button`'s `ai*` variants. Forwards its ref like `Button`
 * so it works as a Radix `asChild` trigger — `AiExplainButton` mounts one
 * inside `PopoverTrigger`, which needs the DOM node to anchor the popover.
 */
export const AiButton = forwardRef<HTMLButtonElement, AiButtonProps>(
  ({ variant = "ai-subtle", loading = false, icon: Icon = Sparkles, disabled, children, ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" className="[&_svg]:text-current" />
      ) : (
        <Icon className="h-4 w-4" aria-hidden="true" />
      )}
      {children}
    </Button>
  ),
);
AiButton.displayName = "AiButton";
