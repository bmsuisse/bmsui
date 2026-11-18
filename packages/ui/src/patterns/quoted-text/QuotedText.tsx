import { type HTMLAttributes, type ReactNode, forwardRef, useId, useState } from "react";
import { FoldPanel } from "../../lib/FoldPanel";
import { cn } from "../../lib/utils";
import { Collapsible } from "../../primitives/collapsible";
import { getI18n, useLabels } from "../../i18n/locale";
import type { IntegratedI18n } from "../../i18n/locale";

export interface QuotedTextLabels {
  show: string;
  hide: string;
}

export const quotedTextLabelsFor = ({ t }: IntegratedI18n): QuotedTextLabels => ({
  show: t("quotedText.show"),
  hide: t("quotedText.hide"),
});

export const defaultQuotedTextLabels: QuotedTextLabels = quotedTextLabelsFor(getI18n("en", false));

export interface QuotedTextProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The quoted reply history. */
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  labels?: Partial<QuotedTextLabels>;
}

/** Collapsed-by-default quoted reply history behind a small "…" pill; wide tables and code scroll inside. */
export const QuotedText = forwardRef<HTMLDivElement, QuotedTextProps>(
  ({ children, defaultOpen = false, open, onOpenChange, labels, className, ...props }, ref) => {
    const l = useLabels(quotedTextLabelsFor, labels);
    const [inner, setInner] = useState(defaultOpen);
    const isOpen = open ?? inner;
    const id = useId();
    const set = (next: boolean) => {
      if (open === undefined) setInner(next);
      onOpenChange?.(next);
    };
    return (
      <Collapsible open={isOpen} onOpenChange={set} asChild>
        <div ref={ref} className={cn("min-w-0", className)} {...props}>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={id}
            aria-label={isOpen ? l.hide : l.show}
            title={isOpen ? l.hide : l.show}
            onClick={() => set(!isOpen)}
            className="inline-flex h-5 items-center rounded-[var(--radius-pill,9999px)] border border-foreground/10 px-2 text-xs leading-none text-muted-foreground hover:bg-foreground/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 dark:border-border pointer-coarse:min-h-8"
          >
            <span aria-hidden="true">…</span>
          </button>
          <FoldPanel open={isOpen}>
            <div
              id={id}
              className="mt-2 min-w-0 border-l-2 border-foreground/10 pl-3 text-sm text-muted-foreground [overflow-wrap:anywhere] dark:border-border [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
            >
              {children}
            </div>
          </FoldPanel>
        </div>
      </Collapsible>
    );
  },
);
QuotedText.displayName = "QuotedText";
