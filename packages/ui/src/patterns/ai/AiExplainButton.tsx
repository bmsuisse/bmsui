import { RefreshCw, Sparkles } from "lucide-react";
import type { ElementType, ReactElement, ReactNode } from "react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { Button } from "../../primitives/button";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";
import type { NavIconProps } from "../sidebar/NavItem";
import { AiButton, type AiButtonTone } from "./AiButton";

export interface AiExplainButtonProps {
  /**
   * Produces the explanation, called the first time the popover opens (and on
   * "Try again" after a failure) — not on mount, so nothing is spent on a
   * button nobody clicks.
   */
  onExplain: () => Promise<ReactNode> | ReactNode;
  /** @default "Explain" */
  label?: string;
  /** Heading inside the popover. @default the label */
  title?: string;
  tone?: AiButtonTone;
  icon?: ElementType<NavIconProps>;
  align?: "start" | "center" | "end";
  className?: string;
  /** Popover width class. @default "w-80" */
  contentClassName?: string;
}

/**
 * "What am I looking at?" button: a sparkle affordance next to a chart, a KPI
 * or a form field that opens a popover and lazily asks the caller's model to
 * explain it. The caller returns any node, so an explanation can be prose,
 * a list, or a small rendered breakdown.
 */
export function AiExplainButton({
  onExplain,
  label = "Explain",
  title,
  tone = "subtle",
  icon = Sparkles,
  align = "start",
  className,
  contentClassName = "w-80",
}: AiExplainButtonProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<ReactNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setContent(await onExplain());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    // ponytail: cached for the life of the component -- a "Regenerate" action
    // can go on top of `load()` if a consumer ever needs a fresh answer.
    if (next && content === null && error === null && !loading) void load();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <AiButton tone={tone} size="sm" icon={icon} className={className}>
          {label}
        </AiButton>
      </PopoverTrigger>
      <PopoverContent align={align} className={contentClassName}>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-violet-600 uppercase dark:text-violet-400">
          <Sparkles className="h-3.5 w-3.5" aria-hidden={true} />
          {title ?? label}
        </p>
        {loading ? (
          <LoadingSpinner size="sm" label="Thinking…" className="text-sm text-muted-foreground" />
        ) : error ? (
          <div className="flex flex-col items-start gap-2">
            <span role="alert" className="text-sm text-destructive">
              {error}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" aria-hidden={true} />
              Try again
            </Button>
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-foreground">{content}</div>
        )}
      </PopoverContent>
    </Popover>
  );
}
