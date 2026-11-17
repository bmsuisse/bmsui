import { XMarkIcon } from "@heroicons/react/24/outline";
import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "../../lib/utils";

export type BannerTone = "neutral" | "info" | "warning" | "brand" | "danger";

export interface BannerLabels {
  dismiss: string;
}

export const defaultBannerLabels: BannerLabels = { dismiss: "Dismiss" };

const TONE: Record<BannerTone, string> = {
  neutral: "bg-muted text-foreground border-foreground/10 dark:border-border",
  info: "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:border-sky-900",
  warning: "bg-amber-400 text-amber-950 border-amber-500",
  brand: "bg-primary text-primary-foreground border-transparent dark:border-border",
  danger: "bg-red-700 text-white border-red-800 dark:bg-red-800",
};

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "role"> {
  /** Message. Wraps and balances on narrow screens. */
  children?: ReactNode;
  /** `neutral` (default), `info`, `warning`, `brand`, `danger`. */
  tone?: BannerTone;
  /** Leading icon (decorative). */
  icon?: ReactNode;
  /** Buttons or links after the message; see `BannerAction` for the matching look. */
  actions?: ReactNode;
  /** Shows a x button that calls this. The banner does not hide itself: set `open={false}`. */
  onDismiss?: () => void;
  labels?: Partial<BannerLabels>;
  /**
   * Whether the bar is shown. The live-region wrapper stays mounted either way
   * and only its content toggles, so a screen reader announces the content when
   * it appears. @default true
   */
  open?: boolean;
  /** `status` (polite, default) or `alert` (assertive) for urgent errors. */
  role?: "status" | "alert";
  /** Fade the content in when it appears. Skipped under reduced motion. @default true */
  animated?: boolean;
  "data-testid"?: string;
}

/**
 * A slim full-width bar for the app shell: offline, "new version available",
 * "you are impersonating", test environment, session expired. It spans the page
 * and sits above the header; for a message inside page content use `AlertBox`.
 */
export const Banner = forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      children,
      tone = "neutral",
      icon,
      actions,
      onDismiss,
      labels,
      open = true,
      role = "status",
      animated = true,
      className,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultBannerLabels, ...labels };
    return (
      <div ref={ref} role={role} className="shrink-0" {...props}>
        {open ? (
          <div
            data-tone={tone}
            className={cn(
              "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-4 py-2 text-[13px] max-md:text-sm",
              animated && "transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none",
              TONE[tone],
              className,
            )}
          >
            <span className="inline-flex min-w-0 items-center justify-center gap-2">
              {icon ? (
                <span aria-hidden="true" className="inline-flex shrink-0 [&_svg]:size-4">
                  {icon}
                </span>
              ) : null}
              <span className="min-w-0 text-balance text-center font-medium leading-snug">{children}</span>
            </span>
            {actions || onDismiss ? (
              <div className="flex items-center gap-1">
                {actions}
                {onDismiss ? (
                  <button
                    type="button"
                    aria-label={l.dismiss}
                    onClick={onDismiss}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-pill,9999px)] outline-none transition-colors hover:bg-current/15 focus-visible:ring-2 focus-visible:ring-current motion-reduce:transition-none max-md:size-11"
                  >
                    <XMarkIcon aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
);
Banner.displayName = "Banner";

/** A pill button that reads on every `Banner` tone (tinted with the banner's own text color). */
export const BannerAction = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill,9999px)] bg-current/15 px-3 py-1.5 text-xs font-semibold outline-none transition-colors hover:bg-current/25 focus-visible:ring-2 focus-visible:ring-current disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none max-md:min-h-11 max-md:px-4 [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  ),
);
BannerAction.displayName = "BannerAction";
