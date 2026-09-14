import { Sparkles } from "lucide-react";
import type { ElementType, ReactElement } from "react";
import { Button, type ButtonProps } from "../../primitives/button";
import { cn } from "../../lib/utils";
import type { NavIconProps } from "../sidebar/NavItem";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";

export type AiButtonTone = "solid" | "subtle" | "ghost";

export interface AiButtonProps extends Omit<ButtonProps, "variant"> {
  /** Swaps the leading icon for a spinner and disables the button while an AI call is in flight. */
  loading?: boolean;
  /** Leading icon. @default Sparkles */
  icon?: ElementType<NavIconProps>;
  /** `solid` = gradient CTA, `subtle` = tinted chip, `ghost` = icon-ish inline action. @default subtle */
  tone?: AiButtonTone;
}

// Tailwind's built-in violet palette rather than theme tokens -- @bmsuisse/ui
// doesn't ship a theme, and consuming apps' shared theme has no "ai" color
// (same reasoning as buttonVariants' note on --color-swiss-primary, except
// here we can stay on stock Tailwind and need no setup at all).
const toneClasses: Record<AiButtonTone, string> = {
  solid:
    "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:from-violet-500 hover:to-indigo-500",
  subtle:
    "border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300 dark:hover:bg-violet-900/50",
  ghost:
    "text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/50",
};

/**
 * The "do something with AI" button: sparkle icon, violet accent, built-in
 * in-flight state. Thin wrapper over `Button` so every other Button prop
 * (`size`, `onClick`, `asChild`, ...) still works — `AiExplainButton` and
 * `VoiceTranscript` both render one of these.
 */
export function AiButton({
  loading = false,
  icon: Icon = Sparkles,
  tone = "subtle",
  disabled,
  className,
  children,
  ...props
}: AiButtonProps): ReactElement {
  return (
    <Button
      variant="ghost"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(toneClasses[tone], className)}
      {...props}
    >
      {loading ? <LoadingSpinner size="sm" className="text-current [&_svg]:text-current" /> : <Icon className="h-4 w-4" aria-hidden={true} />}
      {children}
    </Button>
  );
}
