import { PhotoIcon } from "@heroicons/react/24/outline";
import { type HTMLAttributes, type ReactElement, type ReactNode, useState } from "react";
import { cn } from "../../lib/utils";

const THUMB_SIZES = { sm: 40, md: 56, lg: 88 } as const;

export interface ThumbnailProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  src?: string | null;
  /** Empty (default) marks the image decorative; set it when the image carries information the title doesn't. */
  alt?: string;
  size?: keyof typeof THUMB_SIZES | number;
  fit?: "contain" | "cover";
  /** Shown without `src` or when loading fails. @default a photo icon */
  fallback?: ReactNode;
}

/** Square image tile that falls back to a placeholder icon when there's no image or it fails to load. */
export const Thumbnail = ({
  src,
  alt = "",
  size = "md",
  fit = "contain",
  fallback,
  className,
  style,
  ...props
}: ThumbnailProps): ReactElement => {
  // Compared against `src` so a new image never shows the previous one's failure.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;
  const px = typeof size === "number" ? size : THUMB_SIZES[size];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-foreground/10 bg-muted/40 text-muted-foreground dark:border-border",
        className,
      )}
      style={{ width: px, height: px, ...style }}
      {...props}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailedSrc(src ?? null)}
          className={cn("size-full", fit === "contain" ? "object-contain p-1" : "object-cover")}
        />
      ) : (
        (fallback ?? <PhotoIcon aria-hidden="true" className="size-1/2" />)
      )}
    </span>
  );
};

export interface ResultListProps extends HTMLAttributes<HTMLUListElement> {
  /** Names the list for screen readers, e.g. "Search results". */
  "aria-label": string;
  /** Marks the list as refreshing. */
  busy?: boolean;
}

/** `<ul>` of {@link ResultCard}s. */
export const ResultList = ({ busy, className, ...props }: ResultListProps): ReactElement => (
  <ul aria-busy={busy || undefined} className={cn("space-y-2", className)} {...props} />
);

export interface ResultCardProps {
  title: ReactNode;
  /** One muted line under the title (article number, supplier …). */
  meta?: ReactNode;
  description?: ReactNode;
  /** Left slot, usually a {@link Thumbnail} or `RankBadge`. */
  leading?: ReactNode;
  /** Right slot, usually a price or `ScoreBadge`. */
  trailing?: ReactNode;
  /** Below the text, e.g. tags. */
  footer?: ReactNode;
  selected?: boolean;
  /** Makes the card a button. */
  onSelect?: () => void;
  /** Makes the card a link instead (wins over `onSelect`). */
  href?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

/**
 * One search hit: leading visual, title, meta line, trailing value, optional
 * footer. Data-agnostic: pass already-formatted nodes. The whole card is one
 * native button (or link with `href`), so Enter/Space and tab order work; keep
 * the slots non-interactive. Render several inside a {@link ResultList}.
 */
export const ResultCard = ({
  title,
  meta,
  description,
  leading,
  trailing,
  footer,
  selected = false,
  onSelect,
  href,
  disabled,
  className,
  "data-testid": testId,
}: ResultCardProps): ReactElement => {
  const classes = cn(
    "flex w-full items-start gap-3 rounded-xl border border-foreground/10 bg-background p-3 text-left transition-colors dark:border-border",
    "hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
    selected && "border-foreground bg-foreground/5 dark:border-foreground/60",
    disabled && "pointer-events-none opacity-50",
    className,
  );
  const interactive = !disabled && (href !== undefined || onSelect !== undefined);
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-sm">{title}</span>
        {meta && <span className="block truncate text-muted-foreground text-xs">{meta}</span>}
        {description && <span className="mt-1 line-clamp-2 block text-muted-foreground text-sm">{description}</span>}
        {footer && <span className="mt-2 block">{footer}</span>}
      </span>
      {trailing && <span className="shrink-0 self-center">{trailing}</span>}
    </>
  );
  return (
    <li>
      {href !== undefined && !disabled ? (
        <a href={href} aria-current={selected || undefined} data-testid={testId} className={classes}>
          {body}
        </a>
      ) : interactive ? (
        <button
          type="button"
          aria-current={selected || undefined}
          onClick={onSelect}
          data-testid={testId}
          className={classes}
        >
          {body}
        </button>
      ) : (
        // Disabled or nothing to do: plain element, no tab stop, no href.
        <div aria-current={selected || undefined} aria-disabled={disabled || undefined} data-testid={testId} className={cn(classes, "hover:bg-transparent")}>
          {body}
        </div>
      )}
    </li>
  );
};
