import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { memo, type ComponentType, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Skeleton } from "../../primitives/skeleton";

export interface KpiCardProps {
  label: string;
  value?: string | number | null;
  icon?: ComponentType<{ className?: string }>;
  /**
   * Period-over-period delta. `positive: true` renders green with an up arrow,
   * `positive: false` red with a down arrow, omitted stays neutral (a count, a
   * status — anything that isn't a direction).
   */
  badge?: { text: string; positive?: boolean };
  badgeLabel?: string;
  /** @default "default" */
  variant?: "hero" | "mini" | "default" | "donut";
  loading?: boolean;
  sub?: string;
  /** Colors `sub` — "warn"/"danger" flag something worth acting on (overdue, at-risk), "default" stays muted. */
  subTone?: "default" | "warn" | "danger";
  /** Makes the whole card a link (an `<a>`). Prefer `onClick` for client-side routers. */
  href?: string;
  /** Makes the whole card a button. Ignored when `href` is set. */
  onClick?: () => void;
  sparkline?: number[];
  /** @default "var(--color-primary, #3b82f6)" */
  sparklineColor?: string;
  /** Hero variant only: 0-100 achievement-vs-target bar rendered under `sub`. */
  progress?: number;
  progressLabel?: string;
  /** Donut variant only: the proportions to render as a ring chart, with a legend listing each segment's share. */
  segments?: DonutSegment[];
  /** Donut variant only: big label centered in the ring. Defaults to the sum of `segments`' values. */
  centerValue?: string;
  /** For E2E tests to target a specific tile unambiguously when `label` also appears elsewhere on the page (e.g. a chart legend). */
  testId?: string;
  className?: string;
}

export interface DonutSegment {
  label: string;
  value: number;
  /** @default a color from the built-in palette, cycling by index */
  color?: string;
}

/** Falls back to a fixed palette when the consuming app hasn't registered `--chart-1`..`--chart-6` — see the "Chart tokens" docs. */
const DONUT_COLORS = [
  "var(--chart-1, #3b82f6)",
  "var(--chart-2, #22c55e)",
  "var(--chart-3, #f59e0b)",
  "var(--chart-4, #8b5cf6)",
  "var(--chart-5, #ef4444)",
  "var(--chart-6, #06b6d4)",
];

export function DonutChart({
  data,
  size = 96,
  thickness = 14,
  centerValue,
  centerLabel,
}: {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
}): ReactElement | null {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) return null;

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted" strokeWidth={thickness} />
        {data.map((segment, i) => {
          const fraction = segment.value / total;
          const dash = fraction * circumference;
          const el = (
            <circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color ?? DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap={data.length > 1 ? "butt" : "round"}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      {(centerValue || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="text-base font-bold tracking-tight text-foreground tabular-nums">{centerValue}</span>}
          {centerLabel && <span className="text-[11px] font-medium text-muted-foreground uppercase">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ data, color }: { data: number[]; color: string }): ReactElement | null {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 64;
  const H = 24;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 3) - 1.5}`)
    .join(" ");
  const [lx, ly] = pts.split(" ").at(-1)!.split(",");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 overflow-visible" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeOpacity="0.7"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx} cy={ly} r="2" fill={color} />
    </svg>
  );
}

function AreaSparkline({ data }: { data: number[] }): ReactElement | null {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 200;
  const H = 32;
  const P = 3;
  const xs = data.map((_, i) => (i / (data.length - 1)) * W);
  const ys = data.map((v) => H - ((v - min) / range) * (H - 2 * P) - P);
  const linePts = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const areaPath = `M${xs[0]},${H} ` + xs.map((x, i) => `L${x},${ys[i]}`).join(" ") + ` L${xs[xs.length - 1]},${H} Z`;

  // `currentColor` throughout: the hero sets `text-primary-foreground` on this
  // wrapper, so the trend stays legible on whatever the brand's primary is.
  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="kpi-card-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#kpi-card-spark-fill)" />
      <polyline
        points={linePts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/**
 * Splits a pre-formatted value into a big magnitude plus a small unit so
 * "CHF 1.2 Mio." reads as [CHF] 1.2 Mio., "42 %" as 42 [%] and "12 kunden" as
 * 12 [kunden]. The number is the only thing a rep scans on a phone; the unit
 * only needs to be findable.
 */
function splitValue(value: string): { prefix: string | null; number: string; suffix: string | null } {
  const parts = value.split(/\s(.+)/);
  if (parts.length === 1 || !parts[1]) return { prefix: null, number: value, suffix: null };
  const head = parts[0]!;
  const tail = parts[1]!;
  // Leading currency/unit code ("CHF 1.2 Mio.", "EUR 300") — 2-4 letters, then digits.
  if (/^[A-Za-z€$£]{1,4}$/.test(head) && /^[\d'’.,-]/.test(tail)) return { prefix: head, number: tail, suffix: null };
  // Trailing short unit ("42 %", "3.4 pt") or word ("12 kunden").
  if (/^[\d'’.,+-]/.test(head)) return { prefix: null, number: head, suffix: tail };
  return { prefix: null, number: value, suffix: null };
}

const valueSize = {
  hero: { number: "text-[30px] md:text-[28px]", unit: "text-[13px]" },
  default: { number: "text-[26px]", unit: "text-[13px]" },
  mini: { number: "text-[22px] md:text-[20px]", unit: "text-[12px]" },
} as const;

function KpiValue({
  value,
  size,
  onColor = false,
}: {
  value: string | number;
  size: keyof typeof valueSize;
  onColor?: boolean;
}): ReactElement {
  const str = String(value);
  const { prefix, number, suffix } = splitValue(str);
  const unitClass = cn(
    "font-semibold tracking-normal",
    valueSize[size].unit,
    onColor ? "text-primary-foreground/70" : "text-muted-foreground",
  );
  return (
    // The one authored moment: the number arrives. `starting:` needs no plugin
    // (@starting-style), so consumers get it without tailwindcss-animate.
    <span
      title={str}
      className={cn(
        "block min-w-0 truncate leading-none font-bold tracking-tight tabular-nums transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none",
        valueSize[size].number,
        onColor ? "text-primary-foreground" : "text-foreground",
      )}
    >
      {prefix && <span className={cn(unitClass, "mr-1")}>{prefix}</span>}
      {number}
      {suffix && <span className={cn(unitClass, "ml-1")}>{suffix}</span>}
    </span>
  );
}

function TrendBadge({
  badge,
  onColor = false,
  size = "md",
}: {
  badge: { text: string; positive?: boolean };
  onColor?: boolean;
  size?: "sm" | "md";
}): ReactElement {
  const Arrow = badge.positive === true ? ArrowUpRight : badge.positive === false ? ArrowDownRight : null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-md font-semibold tabular-nums",
        size === "sm" ? "h-5 px-1.5 text-[11px]" : "h-6 px-2 text-[12px]",
        onColor
          ? badge.positive === false
            ? "bg-black/25 text-primary-foreground"
            : "bg-primary-foreground/18 text-primary-foreground"
          : badge.positive === true
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
            : badge.positive === false
              ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
              : "bg-muted text-muted-foreground",
      )}
    >
      {Arrow && <Arrow className={cn("-ml-0.5", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} strokeWidth={2.5} aria-hidden="true" />}
      {badge.text}
    </span>
  );
}

const subToneClass = {
  default: "text-muted-foreground",
  warn: "font-semibold text-amber-700 dark:text-amber-300",
  danger: "font-semibold text-red-600 dark:text-red-400",
} as const;

function IconChip({
  icon: Icon,
  onColor = false,
  interactive = false,
}: {
  icon: ComponentType<{ className?: string }>;
  onColor?: boolean;
  interactive?: boolean;
}): ReactElement {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
        onColor
          ? "bg-primary-foreground/15 text-primary-foreground ring-1 ring-primary-foreground/20"
          : "bg-primary/10 text-primary",
        interactive && !onColor && "group-hover:bg-primary group-hover:text-primary-foreground",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

// `overflow-wrap: anywhere` so a single long word ("Auftragsbestand" in a
// 140px tile) wraps instead of clipping mid-word under the line clamp.
const labelClass =
  "min-w-0 text-[11px] font-semibold leading-[1.25] tracking-[0.08em] uppercase line-clamp-2 [overflow-wrap:anywhere]";

/**
 * Card shell. With `href` it is an `<a>`, with `onClick` a `<button>`, else a
 * `<div>` — the whole tile is the target (a 28px icon was the smallest thing
 * to hit on the mobile Cockpit), with press feedback and a real focus ring.
 */
function Shell({
  href,
  onClick,
  testId,
  className,
  style,
  children,
}: {
  href?: string;
  onClick?: () => void;
  testId?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}): ReactElement {
  const interactive = Boolean(href || onClick);
  const classes = cn(
    "group relative flex min-w-0 flex-col overflow-hidden text-left",
    interactive &&
      "cursor-pointer transition-[border-color,box-shadow,scale,background-color] duration-150 ease-out active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:active:scale-100",
    className,
  );
  if (href) {
    return (
      <a href={href} data-testid={testId} className={classes} style={style}>
        {children}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} data-testid={testId} className={cn(classes, "w-full")} style={style}>
        {children}
      </button>
    );
  }
  return (
    <div data-testid={testId} className={classes} style={style}>
      {children}
    </div>
  );
}

const cardSurface = "rounded-2xl border border-border bg-card text-card-foreground";
const cardInteractive = "hover:border-primary/30 hover:shadow-[0_2px_10px_-4px_rgb(0_0_0/0.12)]";

// ---------------------------------------------------------------------------
// KpiCard
// ---------------------------------------------------------------------------

/**
 * Dashboard KPI tile in four variants — `hero` (primary-colored headline
 * metric with trend, target progress and an area sparkline), `default`
 * (bordered card for a KPI grid), `mini` (compact, for two-up phone grids of
 * secondary metrics) and `donut` (a proportion breakdown). Sized mobile-first
 * for a two-column grid at 320-430px; pass `href`/`onClick` to make the whole
 * tile tappable.
 */
export const KpiCard = memo(function KpiCard({
  label,
  value,
  icon: Icon,
  badge,
  badgeLabel,
  variant = "default",
  loading = false,
  sub,
  subTone = "default",
  href,
  onClick,
  sparkline,
  sparklineColor = "var(--color-primary, #3b82f6)",
  progress,
  progressLabel,
  segments,
  centerValue,
  testId,
  className,
}: KpiCardProps): ReactElement {
  const interactive = Boolean(href || onClick);
  const hasTrend = Boolean(sparkline && sparkline.length > 1);

  if (variant === "hero") {
    const pct = progress != null ? Math.min(100, Math.max(0, progress)) : null;
    return (
      <Shell
        href={href}
        onClick={onClick}
        testId={testId}
        className={cn(
          "col-span-2 h-full gap-2 rounded-2xl p-4 text-primary-foreground lg:col-span-1",
          interactive && "hover:brightness-[1.06] active:brightness-100",
          className,
        )}
        style={{
          // A touch darker toward the bottom-right gives the surface material
          // without reading as a gradient effect; the shadow is the primary's own hue.
          background:
            "linear-gradient(160deg, var(--color-primary) 0%, color-mix(in oklab, var(--color-primary) 86%, black) 100%)",
          boxShadow: "0 4px 14px -6px color-mix(in oklab, var(--color-primary) 55%, transparent)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className={cn(labelClass, "pt-1 text-primary-foreground/75")} title={label}>
            {label}
          </p>
          {Icon && <IconChip icon={Icon} onColor />}
        </div>

        {loading ? (
          <div className="h-[30px] w-32 animate-pulse rounded-md bg-primary-foreground/15 md:h-7" />
        ) : (
          <KpiValue value={value ?? "—"} size="hero" onColor />
        )}

        {(badge || badgeLabel) && !loading && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {badge && <TrendBadge badge={badge} onColor />}
            {badgeLabel && <span className="text-[12px] text-primary-foreground/75">{badgeLabel}</span>}
          </div>
        )}

        {sub && !loading && <p className="text-[12px] text-primary-foreground/80 tabular-nums">{sub}</p>}

        {pct != null && !loading && (
          <div className="mt-0.5 flex items-center gap-2">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
              aria-label={progressLabel}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary-foreground/20"
            >
              <div
                className="h-full w-(--kpi-progress) rounded-full bg-primary-foreground/90 transition-[width] duration-500 ease-out starting:w-0 motion-reduce:transition-none"
                style={{ "--kpi-progress": `${pct}%` } as CSSProperties}
              />
            </div>
            {progressLabel && (
              <span className="shrink-0 text-[12px] font-semibold text-primary-foreground/90 tabular-nums">{progressLabel}</span>
            )}
          </div>
        )}

        {hasTrend && !loading && (
          <div className="-mx-4 -mb-4 mt-auto pt-2">
            <AreaSparkline data={sparkline!} />
          </div>
        )}
      </Shell>
    );
  }

  if (variant === "mini") {
    return (
      <Shell
        href={href}
        onClick={onClick}
        testId={testId}
        className={cn("@container h-full gap-2 p-3", cardSurface, interactive && cardInteractive, className)}
      >
        <div className="flex items-start justify-between gap-2">
          <p className={cn(labelClass, "pt-0.5 text-muted-foreground")} title={label}>
            {label}
          </p>
          {Icon && <IconChip icon={Icon} interactive={interactive} />}
        </div>

        <div className="mt-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {loading ? (
            <Skeleton className="h-[22px] w-20 md:h-5" />
          ) : (
            <>
              <KpiValue value={value ?? "—"} size="mini" />
              {badge && <TrendBadge badge={badge} size="sm" />}
            </>
          )}
        </div>

        {(sub || hasTrend) && !loading && (
          <div className="flex items-end justify-between gap-2">
            {sub ? (
              <p className={cn("min-w-0 truncate text-[12px] leading-4", subToneClass[subTone])} title={sub}>
                {sub}
              </p>
            ) : (
              <span />
            )}
            {/* Container query, not a viewport breakpoint: a 140px tile in a two-up
                phone grid has no room for both a sub line and a trend. */}
            {hasTrend && (
              <span className={cn("shrink-0", sub && "hidden @[176px]:inline-flex")}>
                <Sparkline data={sparkline!} color={sparklineColor} />
              </span>
            )}
          </div>
        )}
      </Shell>
    );
  }

  if (variant === "donut") {
    const total = segments?.reduce((sum, s) => sum + s.value, 0) ?? 0;

    return (
      <Shell
        href={href}
        onClick={onClick}
        testId={testId}
        className={cn("h-full gap-3 p-4", cardSurface, interactive && cardInteractive, className)}
      >
        <div className="flex items-start justify-between gap-3">
          <p className={cn(labelClass, "pt-0.5 text-muted-foreground")} title={label}>
            {label}
          </p>
          {Icon && <IconChip icon={Icon} interactive={interactive} />}
        </div>

        {loading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ) : segments && segments.length > 0 ? (
          <div className="flex items-center gap-4">
            <DonutChart data={segments} centerValue={centerValue ?? String(total)} />
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {segments.map((segment, i) => (
                <li key={segment.label} className="flex items-center gap-2 text-[12px] leading-4">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color ?? DONUT_COLORS[i % DONUT_COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{segment.label}</span>
                  <span className="shrink-0 font-semibold text-foreground tabular-nums">
                    {total > 0 ? `${Math.round((segment.value / total) * 100)}%` : segment.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <span className="block text-2xl font-bold text-muted-foreground/50">—</span>
        )}

        {sub && !loading && <p className={cn("text-[12px] leading-4 tabular-nums", subToneClass[subTone])}>{sub}</p>}
      </Shell>
    );
  }

  // Default variant
  return (
    <Shell
      href={href}
      onClick={onClick}
      testId={testId}
      className={cn("h-full gap-3 p-4", cardSurface, interactive && cardInteractive, className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn(labelClass, "pt-0.5 text-muted-foreground")} title={label}>
          {label}
        </p>
        {Icon && <IconChip icon={Icon} interactive={interactive} />}
      </div>

      <div className="flex flex-col gap-1">
        {loading ? (
          <Skeleton className="h-[26px] w-24" />
        ) : value == null ? (
          <span className="block text-[26px] leading-none font-bold text-muted-foreground/50">—</span>
        ) : (
          <KpiValue value={value} size="default" />
        )}
        {sub && !loading && <p className={cn("text-[12px] leading-4 tabular-nums", subToneClass[subTone])}>{sub}</p>}
      </div>

      {(badge || badgeLabel || hasTrend) && !loading && (
        <div className="flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {badge && <TrendBadge badge={badge} size="sm" />}
            {badgeLabel && <span className="text-[12px] leading-4 text-muted-foreground">{badgeLabel}</span>}
          </div>
          {hasTrend && <Sparkline data={sparkline!} color={sparklineColor} />}
        </div>
      )}
    </Shell>
  );
});
