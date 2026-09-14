import { RefreshCw, Sparkles } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { Button } from "../../primitives/button";
import { AlertBox } from "../alert-box/AlertBox";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";
import { AiButton, type AiButtonProps } from "./AiButton";

export interface AiExplainButtonProps
  extends Omit<AiButtonProps, "children" | "onClick" | "loading" | "title" | "aria-busy"> {
  /**
   * Produces the explanation, called the first time the popover opens (and on
   * "Try again" after a failure) — not on mount, so nothing is spent on a
   * button nobody clicks.
   */
  onExplain: () => Promise<ReactNode> | ReactNode;
  /** Button text. @default "Explain" */
  label?: string;
  /** Heading inside the popover. @default the label */
  title?: string;
  /** Popover alignment relative to the button. @default "start" */
  align?: "start" | "center" | "end";
  /** Class names for the popover panel, e.g. to widen it. @default "w-80" */
  contentClassName?: string;
}

/**
 * "What am I looking at?" button: a sparkle affordance next to a chart, a KPI
 * or a form field that opens a popover and lazily asks the caller's model to
 * explain it. The caller returns any node, so an explanation can be prose,
 * a list, or a small rendered breakdown. Every other prop (`variant`, `size`,
 * `icon`, `data-testid`, ...) goes to the underlying `AiButton`.
 */
export function AiExplainButton({
  onExplain,
  label = "Explain",
  title,
  align = "start",
  contentClassName = "w-80",
  size = "sm",
  ...props
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
        <AiButton size={size} {...props}>
          {label}
        </AiButton>
      </PopoverTrigger>
      <PopoverContent align={align} className={contentClassName}>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {title ?? label}
        </p>
        {loading ? (
          <LoadingSpinner size="sm" label="Thinking…" className="text-sm text-muted-foreground" />
        ) : error ? (
          <div className="flex flex-col items-start gap-2">
            <div role="alert" className="w-full">
              <AlertBox variant="error">{error}</AlertBox>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto text-sm leading-relaxed">{content}</div>
        )}
      </PopoverContent>
    </Popover>
  );
}
