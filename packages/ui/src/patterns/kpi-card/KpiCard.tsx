import { memo, type ComponentType, type ReactElement } from "react";
import { cn } from "../../lib/utils";
import { Skeleton } from "../../primitives/skeleton";

export interface KpiCardProps {
  label: string;
  value?: string | number | null;
  icon?: ComponentType<{ className?: string }>;
  badge?: { text: string; positive?: boolean };
  badgeLabel?: string;
  /** @default "default" */
  variant?: "hero" | "mini" | "default" | "donut";
  loading?: boolean;
  sub?: string;
  /** Colors `sub` on the mini variant — "warn"/"danger" flag something worth acting on (overdue, at-risk), "default" stays muted. */
  subTone?: "default" | "warn" | "danger";
  /** Makes the icon (mini variant) or the whole card clickable. */
  href?: string;
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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/40" strokeWidth={thickness} />
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
          {centerValue && <span className="text-base font-black tracking-tight text-foreground tabular-nums">{centerValue}</span>}
          {centerLabel && <span className="text-[9px] font-medium text-muted-foreground uppercase">{centerLabel}</span>}
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
  const W = 72;
  const H = 28;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 2) - 1}`)
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AreaSparkline({ data, color }: { data: number[]; color: string }): ReactElement | null {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 200;
  const H = 28;
  const P = 2;
  const xs = data.map((_, i) => (i / (data.length - 1)) * W);
  const ys = data.map((v) => H - ((v - min) / range) * (H - 2 * P) - P);
  const linePts = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const areaPath = `M${xs[0]},${H} ` + xs.map((x, i) => `L${x},${ys[i]}`).join(" ") + ` L${xs[xs.length - 1]},${H} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="kpi-card-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#kpi-card-spark-fill)" />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill={color} />
    </svg>
  );
}

const rowBetween = "flex items-center justify-between";

/**
 * Dashboard KPI tile in three variants — `hero` (large, primary-colored,
 * for the single headline metric), `default` (bordered card for a KPI
 * grid), and `mini` (compact, for dense grids of secondary metrics).
 * Optionally shows a badge, a trend sparkline, and (hero only) a
 * progress-vs-target bar.
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
  sparkline,
  sparklineColor = "var(--color-primary, #3b82f6)",
  progress,
  progressLabel,
  segments,
  centerValue,
  testId,
}: KpiCardProps): ReactElement {
  if (variant === "hero") {
    return (
      <div
        data-testid={testId}
        className="relative col-span-2 flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden rounded-2xl p-4 md:p-3 lg:col-span-1 lg:max-w-[340px] lg:min-w-[260px]"
        style={{
          background: "var(--color-primary)",
          boxShadow: "0 2px 10px color-mix(in oklch, var(--color-primary) 18%, transparent)",
        }}
      >
        <div className="relative flex items-start justify-between">
          <p className="text-[11px] font-bold tracking-[0.14em] text-white/70 uppercase">{label}</p>
          {Icon && (
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
              <Icon className="h-3 w-3 text-white/90" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="relative">
          {loading ? (
            <div className="h-6 w-28 animate-pulse rounded-lg bg-white/15" />
          ) : (
            <p className="text-2xl leading-none font-black tracking-tight text-white tabular-nums md:text-[22px]">
              {value ?? "—"}
            </p>
          )}
        </div>

        {(badge || badgeLabel) && !loading && (
          <div className="relative flex items-center gap-2">
            {badge && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ring-1",
                  badge.positive ? "bg-white/15 text-white ring-white/25" : "bg-black/25 text-white ring-white/15",
                )}
              >
                {badge.text}
              </span>
            )}
            {badgeLabel && <span className="text-[11px] text-white/70">{badgeLabel}</span>}
          </div>
        )}

        {sub && !loading && (
          <p className="relative -mt-1 text-[11px] font-medium text-white/75 tabular-nums">{sub}</p>
        )}

        {progress != null && !loading && (
          <div className="relative flex items-center gap-1.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div className="h-1 rounded-full bg-white/85" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
            {progressLabel && <span className="shrink-0 text-[11px] font-semibold text-white/80 tabular-nums">{progressLabel}</span>}
          </div>
        )}

        {/* Area sparkline pinned to bottom, always white: the hero card's own
            background is the `var(--color-primary)` gradient above, so a
            primary-colored line (the default) disappears against it. */}
        {sparkline && sparkline.length > 1 && !loading && (
          <div className="relative -mx-4 mt-auto -mb-4 md:-mx-3 md:-mb-3">
            <AreaSparkline data={sparkline} color="#ffffff" />
          </div>
        )}
      </div>
    );
  }

  if (variant === "mini") {
    const iconSlot = Icon ? (
      href ? (
        <a
          href={href}
          className="tap-target flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-[background-color,scale] hover:bg-primary/20 active:scale-90 motion-reduce:transition-none md:h-6 md:w-6"
        >
          <Icon className="h-4 w-4 md:h-3.5 md:w-3.5" aria-hidden="true" />
        </a>
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary md:h-6 md:w-6">
          <Icon className="h-4 w-4 md:h-3.5 md:w-3.5" aria-hidden="true" />
        </div>
      )
    ) : null;

    return (
      <div
        data-testid={testId}
        className={cn(
          "flex h-full min-w-0 flex-1 flex-col gap-1.5 overflow-hidden rounded-2xl border border-border bg-card p-3 transition-shadow md:p-2.5",
          href && "hover:border-primary/20 hover:shadow-md",
        )}
      >
        <div className={rowBetween}>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
          {iconSlot}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <>
              <p className="min-w-0 animate-in truncate text-[20px] leading-none font-black tracking-tight text-foreground duration-200 fade-in-0 tabular-nums motion-reduce:animate-none md:text-[16px]">
                {value ?? "—"}
              </p>
              {badge && (
                <span
                  className={cn(
                    "shrink-0 animate-in rounded-md px-1.5 py-0.5 text-[11px] font-bold duration-200 fade-in-0 tabular-nums motion-reduce:animate-none",
                    badge.positive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {badge.text}
                </span>
              )}
            </>
          )}
        </div>

        {(sub || sparkline) && !loading && (
          <div className="flex items-end justify-between gap-2">
            {sub && (
              <p
                className={cn(
                  "text-[11px]",
                  subTone === "danger"
                    ? "font-semibold text-red-600 dark:text-red-400"
                    : subTone === "warn"
                      ? "font-semibold text-amber-700 dark:text-amber-300"
                      : "text-muted-foreground",
                )}
              >
                {sub}
              </p>
            )}
            {sparkline && <Sparkline data={sparkline} color={sparklineColor} />}
          </div>
        )}
      </div>
    );
  }

  if (variant === "donut") {
    const total = segments?.reduce((sum, s) => sum + s.value, 0) ?? 0;

    return (
      <div data-testid={testId} className="rounded-xl border border-border bg-card p-5">
        <div className={rowBetween}>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
          {Icon && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          )}
        </div>

        {loading ? (
          <div className="mt-3 flex items-center gap-4">
            <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ) : segments && segments.length > 0 ? (
          <div className="mt-3 flex items-center gap-4">
            <DonutChart data={segments} centerValue={centerValue ?? String(total)} />
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {segments.map((segment, i) => (
                <li key={segment.label} className="flex items-center gap-2 text-[12px]">
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
          <span className="mt-3 block text-2xl font-black text-muted-foreground/40">—</span>
        )}

        {sub && !loading && <p className="mt-2.5 text-[11px] text-muted-foreground tabular-nums">{sub}</p>}
      </div>
    );
  }

  // Default variant: splits a value like "12 kunden" or "42 %" into a
  // large number plus a small prefix/suffix unit.
  const strValue = value != null ? String(value) : null;
  const parts = strValue ? strValue.split(/\s(.+)/) : null;
  const plain = !parts || parts.length === 1;
  const isSuffix = !plain && /^\d/.test(parts![0]!) && parts![1]!.length <= 3;
  const prefix = isSuffix ? null : parts?.[0];
  const number = isSuffix ? parts![0] : (parts?.[1] ?? parts?.[0]);
  const suffix = isSuffix ? parts![1] : null;

  return (
    <div data-testid={testId} className="rounded-xl border border-border bg-card p-5">
      <div className={rowBetween}>
        <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
        {Icon && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : value == null ? (
          <span className="text-2xl font-black text-muted-foreground/40">—</span>
        ) : plain ? (
          <span className="animate-in text-2xl font-black tracking-tight text-foreground duration-200 fade-in-0 tabular-nums motion-reduce:animate-none">
            {strValue}
          </span>
        ) : (
          <span className="animate-in font-black tracking-tight text-foreground duration-200 fade-in-0 tabular-nums motion-reduce:animate-none">
            {prefix && <span className="text-sm text-muted-foreground">{prefix} </span>}
            <span className="text-2xl">{number}</span>
            {suffix && <span className="text-sm text-muted-foreground"> {suffix}</span>}
          </span>
        )}
        {sub && !loading && <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{sub}</p>}
      </div>

      {(badge || badgeLabel || sparkline) && !loading && (
        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {badge && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  badge.positive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {badge.text}
              </span>
            )}
            {badgeLabel && <span className="text-[11px] text-muted-foreground">{badgeLabel}</span>}
          </div>
          {sparkline && <Sparkline data={sparkline} color={sparklineColor} />}
        </div>
      )}
    </div>
  );
});
