import { type CSSProperties, type HTMLAttributes, type ReactElement, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../primitives/tooltip";
import type { StatusTone } from "../status-badge/StatusBadge";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE: Record<AvatarSize, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-14 w-14 text-lg",
};
const DOT_SIZE: Record<AvatarSize, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
};
const DOT_TONE: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-sky-500",
  neutral: "bg-muted-foreground/70",
};

/**
 * Initials tiles. Fixed palette pairs (the theme has no categorical tokens for
 * this): a light tint with dark text in light mode, a translucent tint with light
 * text in dark mode — both pass AA for the 1–2 bold letters.
 */
const PALETTE = [
  "bg-sky-100 text-sky-800 dark:bg-sky-500/25 dark:text-sky-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-500/25 dark:text-violet-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-500/25 dark:text-teal-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-500/25 dark:text-orange-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/25 dark:text-indigo-200",
];

/** "Anna Muster" → "AM", "anna.muster@x.ch" → "AM", "Sika AG" → "SA", "Ölwerk" → "Ö". */
export function getInitials(name: string): string {
  const base = name.includes("@") ? (name.split("@")[0] ?? "").replace(/[._-]+/g, " ") : name;
  const words = base.trim().split(/\s+/).filter(Boolean);
  const firstWord = words[0];
  if (!firstWord) return "?";
  const lastWord = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  const first = Array.from(firstWord)[0] ?? "";
  const last = Array.from(lastWord)[0] ?? "";
  return (first + last).toUpperCase();
}

/** Stable palette index for a name: same person, same color, on every page and in every app. */
export function avatarColorIndex(name: string): number {
  let hash = 0;
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) | 0;
  return Math.abs(hash) % PALETTE.length;
}

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Person or company name: drives the initials, the tile color and the accessible name. */
  name: string;
  /** Photo or logo URL. Initials show while it loads and if it fails. */
  src?: string | null;
  /** Override the derived initials (e.g. a customer short code). */
  initials?: string;
  /** `xs` 20px, `sm` 24px, `md` 32px (default), `lg` 40px, `xl` 56px. */
  size?: AvatarSize;
  /** `circle` (default) for people, `square` for companies/products. */
  shape?: "circle" | "square";
  /** `object-cover` (default) for photos, `contain` for logos/favicons. */
  fit?: "cover" | "contain";
  /** Presence/status dot in the bottom-right corner. */
  status?: StatusTone;
  /** Screen-reader text for `status`, appended to the name ("Anna Muster, online"). */
  statusLabel?: string;
  /** Hide from assistive tech when the name is already written next to it. */
  decorative?: boolean;
}

/**
 * A person's or company's picture with an initials fallback in a deterministic
 * color. Use it in headers, list rows, comments and assignee fields; for a
 * stack of people use `AvatarGroup`.
 */
export const Avatar = ({
  name,
  src,
  initials,
  size = "md",
  shape = "circle",
  fit = "cover",
  status,
  statusLabel,
  decorative = false,
  className,
  ...props
}: AvatarProps): ReactElement => {
  const [loaded, setLoaded] = useState<"loading" | "loaded" | "error">("loading");
  const imgRef = useRef<HTMLImageElement>(null);
  // An image that finished loading before hydration (or from cache) never fires
  // `onLoad` for React, so check the element itself whenever `src` changes.
  useEffect(() => {
    const img = imgRef.current;
    setLoaded(img?.complete && img.naturalWidth > 0 ? "loaded" : "loading");
  }, [src]);
  const round = shape === "circle" ? "rounded-full" : "rounded-md";
  const showImage = Boolean(src) && loaded !== "error";
  const label = statusLabel ? `${name}, ${statusLabel}` : name;
  return (
    <span
      data-testid="avatar"
      data-status={status}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn("relative inline-flex shrink-0 select-none", SIZE[size], className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-full w-full items-center justify-center overflow-hidden font-semibold leading-none transition-colors duration-200 ease-out motion-reduce:transition-none",
          round,
          loaded === "loaded" && showImage ? "bg-transparent" : PALETTE[avatarColorIndex(name)],
        )}
      >
        {/* Initials stay under the photo and fade out as it fades in (200ms cross-fade). */}
        <span
          data-testid="avatar-initials"
          className={cn(
            "transition-opacity duration-200 ease-out motion-reduce:transition-none",
            loaded === "loaded" && showImage && "opacity-0",
          )}
        >
          {initials ?? getInitials(name)}
        </span>
        {showImage ? (
          <img
            ref={imgRef}
            src={src ?? undefined}
            alt=""
            onLoad={() => setLoaded("loaded")}
            onError={() => setLoaded("error")}
            className={cn(
              "absolute inset-0 h-full w-full",
              round,
              fit === "cover" ? "object-cover" : "bg-background object-contain",
              "transition-opacity duration-200 ease-out motion-reduce:transition-none",
              loaded === "loaded" ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null}
      </span>
      {status ? (
        <span
          aria-hidden="true"
          data-testid="avatar-status"
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
            DOT_SIZE[size],
            DOT_TONE[status],
            shape === "square" && "-bottom-0.5 -right-0.5",
          )}
        />
      ) : null}
    </span>
  );
};

export interface AvatarGroupItem {
  /** Stable key; defaults to the name. */
  id?: string;
  name: string;
  src?: string | null;
  status?: StatusTone;
}

export interface AvatarGroupLabels {
  /** Accessible name and visible text of the overflow chip. */
  more: (count: number) => string;
}

export const defaultAvatarGroupLabels: AvatarGroupLabels = {
  more: (count) => `${count} more`,
};

export interface AvatarGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  items: AvatarGroupItem[];
  /** Avatars shown before the "+N" chip. @default 4 */
  max?: number;
  size?: AvatarSize;
  shape?: AvatarProps["shape"];
  labels?: Partial<AvatarGroupLabels>;
  /**
   * Fan the stack out slightly (3px per avatar, 200ms ease-out) while the pointer
   * is over the group or focus is inside it. Off under reduced motion. @default true
   */
  animated?: boolean;
}

/** Spread on hover/focus-within: each item moves right by its index × 3px. */
const SPREAD =
  "transition-[translate] duration-200 ease-out motion-safe:group-hover/ag:translate-x-[calc(var(--ag-i)*3px)] motion-safe:group-focus-within/ag:translate-x-[calc(var(--ag-i)*3px)]";

/**
 * Overlapping avatars for a team, assignees or watchers. Shows up to `max` and
 * a "+N" chip whose tooltip lists everyone hidden behind it. Each avatar also
 * names its person in a tooltip.
 */
export const AvatarGroup = ({
  items,
  max = 4,
  size = "md",
  shape = "circle",
  labels,
  animated = true,
  className,
  ...props
}: AvatarGroupProps): ReactElement => {
  const l = { ...defaultAvatarGroupLabels, ...labels };
  // Showing "+1" in place of the one remaining avatar saves no space; show it instead.
  const limit = items.length === max + 1 ? items.length : Math.max(0, max);
  const visible = items.slice(0, limit);
  const hidden = items.slice(limit);
  const round = shape === "circle" ? "rounded-full" : "rounded-md";
  return (
    <TooltipProvider delayDuration={200}>
      <div
        data-testid="avatar-group"
        role="group"
        aria-label={items.map((i) => i.name).join(", ")}
        className={cn("group/ag flex items-center", size === "xs" || size === "sm" ? "-space-x-1" : "-space-x-1.5", className)}
        {...props}
      >
        {visible.map((item, i) => (
          <Tooltip key={item.id ?? item.name}>
            <TooltipTrigger asChild>
              {/* Earlier avatars stack on top so each one's status dot (bottom-right) stays
                  visible instead of being covered by its neighbour. The solid bg-background
                  under the tile keeps the translucent dark-mode tints from showing the
                  neighbour through. */}
              <span
                className={cn("relative inline-flex bg-background ring-2 ring-background hover:!z-20", round, animated && SPREAD)}
                style={{ zIndex: visible.length - i, "--ag-i": i } as CSSProperties}
              >
                <Avatar name={item.name} src={item.src} status={item.status} size={size} shape={shape} />
              </span>
            </TooltipTrigger>
            <TooltipContent>{item.name}</TooltipContent>
          </Tooltip>
        ))}
        {hidden.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                // Focusable so keyboard users can reach the tooltip listing the hidden names.
                tabIndex={0}
                role="img"
                aria-label={`${l.more(hidden.length)}: ${hidden.map((i) => i.name).join(", ")}`}
                data-testid="avatar-group-overflow"
                // On top of the last avatar so the "+N" text is never clipped.
                style={{ zIndex: visible.length + 1, "--ag-i": visible.length } as CSSProperties}
                className={cn(
                  // Solid mix rather than bg-muted (invisible on the light surface) or a
                  // translucent tint (would show the neighbour through).
                  "relative inline-flex shrink-0 cursor-default items-center justify-center bg-[color-mix(in_oklab,var(--color-foreground)_8%,var(--color-background))] font-semibold tabular-nums text-muted-foreground ring-2 ring-background focus-visible:outline-none focus-visible:ring-ring dark:bg-[color-mix(in_oklab,var(--color-foreground)_14%,var(--color-background))] dark:text-foreground/80",
                  round,
                  SIZE[size],
                  animated && SPREAD,
                )}
              >
                +{hidden.length}
              </span>
            </TooltipTrigger>
            <TooltipContent data-testid="avatar-group-overflow-list" className="max-w-60">
              <ul className="flex flex-col gap-0.5">
                {hidden.map((item) => (
                  <li key={item.id ?? item.name}>{item.name}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  );
};
