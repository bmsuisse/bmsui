import { AlertCircle, Inbox, SearchX, WifiOff } from "lucide-react";
import type { ComponentType, HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";

/**
 * What kind of nothing this is. Each has its own default icon and copy
 * register: `empty` (nothing created yet — teach the next step), `no-results`
 * (a filter/search excluded everything — offer to widen it), `error` (loading
 * failed — name it and offer a retry), `offline` (no connection).
 */
export type EmptyStateVariant = "empty" | "no-results" | "error" | "offline";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
}

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  /** One or two sentences: why it's empty and what to do about it. */
  description?: ReactNode;
  /** @default "empty" */
  variant?: EmptyStateVariant;
  /**
   * Replaces the variant's default lucide icon.
   *
   * AI empty-state recipe: for an AI welcome/empty screen, pass
   * `icon={Sparkles}` (lucide) and tint the icon tile to the AI hue with
   * `className`. `className` only reaches the root element, not the icon
   * tile itself, so the tint has to be applied through the tile's
   * `data-slot="icon"` marker, e.g.
   * `className="[&_[data-slot=icon]]:bg-[var(--ai,#6366f1)]/10 [&_[data-slot=icon]]:text-[var(--ai,#6366f1)]"`.
   * That `[var(--ai,#6366f1)]` arbitrary-value-with-fallback form is the same
   * convention `AiMarker` uses: this package ships no CSS, so a `bg-ai`/
   * `text-ai` token class only resolves once the consuming app has
   * registered `--color-ai` in its own `@theme inline` block, while the
   * arbitrary-value form works everywhere, token or not.
   */
  icon?: ComponentType<{ className?: string }>;
  /** Primary next step (a solid button). For `error`, this is where "Try again" goes. */
  action?: EmptyStateAction;
  /** Quieter alternative next to the primary action (a ghost button), e.g. "Clear filters". */
  secondaryAction?: EmptyStateAction;
  /**
   * `md` is the full-panel placeholder for a page region or list; `sm` is
   * the in-card version for a dashboard tile or detail section.
   * @default "md"
   */
  size?: "sm" | "md";
  /**
   * Stretches to fill and vertically center inside a flex-column parent
   * (a scroll region, a card body) instead of sitting at its top.
   */
  fill?: boolean;
  /**
   * Extra content under the actions (a hint, a link to docs). Renders as a
   * quiet `text-xs text-muted-foreground` line — for interactive content
   * (suggestion chips, a compact form), use `footer` instead, which is
   * un-styled and full-width.
   */
  children?: ReactNode;
  /**
   * Full-width, un-styled slot below the actions for INTERACTIVE content
   * (suggestion chips, a compact form) — unlike `children`, which is the
   * quiet hint line and imposes `text-xs text-muted-foreground`. Capped at
   * `max-w-lg` so it stays readable in a wide panel.
   */
  footer?: ReactNode;
  testId?: string;
}

const DEFAULT_ICON: Record<EmptyStateVariant, ComponentType<{ className?: string }>> = {
  empty: Inbox,
  "no-results": SearchX,
  error: AlertCircle,
  offline: WifiOff,
};

/**
 * The placeholder a list, table, search result or panel shows when there is
 * nothing to render — designed to teach the interface (what belongs here,
 * how to get it) rather than just say "nothing here". The `error` variant
 * covers the failed-load case with the same shape, so a region's empty and
 * broken states line up instead of one being a centered spinner leftover.
 *
 * Extracted from the ad-hoc icon-tile + title + body placeholders surveyed
 * in consuming apps, with the missing pieces added: actions, an error tone,
 * and a `role="status"` so a screen reader hears the outcome of a search.
 */
export const EmptyState = ({
  title,
  description,
  variant = "empty",
  icon,
  action,
  secondaryAction,
  size = "md",
  fill = false,
  children,
  footer,
  className,
  testId,
  ...props
}: EmptyStateProps): ReactElement => {
  const Icon = icon ?? DEFAULT_ICON[variant];
  const sm = size === "sm";
  const isError = variant === "error";
  const ActionIcon = action?.icon;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div
      role={isError ? "alert" : "status"}
      data-variant={variant}
      data-testid={testId}
      className={cn(
        "flex flex-col items-center text-center",
        sm ? "gap-2 px-4 py-5" : "gap-3 px-6 py-10 sm:py-12",
        fill && "min-h-0 flex-1 justify-center",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="icon"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          sm ? "size-9" : "size-14",
          isError
            ? "bg-destructive/10 text-destructive dark:bg-destructive/20"
            : "bg-muted text-muted-foreground ring-1 ring-border ring-inset",
        )}
      >
        <Icon className={sm ? "size-4" : "size-6"} />
      </span>
      <div className={cn("flex max-w-[36ch] flex-col", sm ? "gap-0.5" : "gap-1")}>
        <p className={cn("font-semibold text-foreground [text-wrap:balance]", sm ? "text-sm" : "text-base")}>{title}</p>
        {description != null && (
          <p className={cn("text-muted-foreground [text-wrap:pretty]", sm ? "text-xs leading-4" : "text-sm leading-5")}>
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className={cn("flex flex-wrap items-center justify-center gap-2", sm ? "mt-0.5" : "mt-1")}>
          {action && (
            <Button
              type="button"
              variant={isError ? "outline" : "default"}
              size={sm ? "sm" : "default"}
              className={cn(!sm && "h-10 px-4 sm:h-9 sm:px-3")}
              onClick={action.onClick}
            >
              {ActionIcon && <ActionIcon className="size-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              type="button"
              variant="ghost"
              size={sm ? "sm" : "default"}
              className={cn(!sm && "h-10 px-4 sm:h-9 sm:px-3")}
              onClick={secondaryAction.onClick}
            >
              {SecondaryIcon && <SecondaryIcon className="size-4" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {children != null && <div className="text-xs text-muted-foreground">{children}</div>}
      {footer != null && <div className="w-full max-w-lg">{footer}</div>}
    </div>
  );
};
