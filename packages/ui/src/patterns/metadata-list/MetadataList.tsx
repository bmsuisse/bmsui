import { CheckIcon, ClipboardDocumentIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { type CSSProperties, type HTMLAttributes, type ReactElement, type ReactNode, useEffect } from "react";
import { useClipboard } from "../../hooks/useClipboard";
import { cn } from "../../lib/utils";

export interface MetadataItem {
  /** Stable key; defaults to the label when it is a string, else the index. */
  id?: string;
  label: ReactNode;
  /** `null`, `undefined` and `""` render the empty placeholder ("—"). */
  value?: ReactNode;
  /** Copy button for this row. Overrides the list's `copyable`. */
  copyable?: boolean;
  /** Text put on the clipboard. Defaults to `value` when it is a string or number; rows with neither get no button. */
  copyValue?: string;
  /** Let this item span the full row (long text, an address, notes). */
  fullWidth?: boolean;
}

export interface MetadataListLabels {
  /** Placeholder for an empty value. */
  empty: string;
  /** Accessible name of the copy button; the item label is appended when it is a string. */
  copy: string;
  /** Announced after copying. */
  copied: string;
  /** Announced (and shown as the button's tooltip) when the clipboard refused the copy. */
  copyFailed: string;
}

export const defaultMetadataListLabels: MetadataListLabels = {
  empty: "—",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Copy failed",
};

export interface MetadataListProps extends Omit<HTMLAttributes<HTMLDListElement>, "children"> {
  items: MetadataItem[];
  /** `vertical` (default): label stacked above value. `horizontal`: label column on the left, value on the right. */
  layout?: "vertical" | "horizontal";
  /** Columns on wide screens; collapses to 1 on phones and to 2 on tablets. @default 1 */
  columns?: 1 | 2 | 3 | 4;
  /** Copy buttons on every row with a string/number value. @default false */
  copyable?: boolean;
  /** Width of the label column in the `horizontal` layout (any CSS length). @default "10rem" */
  labelWidth?: string;
  /** Hairline between rows (`horizontal` layout reads best with it). @default false */
  divided?: boolean;
  labels?: Partial<MetadataListLabels>;
}

const COLUMNS: Record<NonNullable<MetadataListProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};
const FULL_SPAN: Record<NonNullable<MetadataListProps["columns"]>, string> = {
  1: "",
  2: "sm:col-span-2",
  3: "sm:col-span-2 lg:col-span-3",
  4: "sm:col-span-2 lg:col-span-4",
};

const isEmpty = (value: ReactNode): boolean => value == null || value === "" || value === false;

/**
 * Label/value pairs for a detail page or side panel (customer number, created by,
 * address…), rendered as a `<dl>`. Use it instead of hand-built label/value
 * grids; for tabular data with many rows use `Table` or the datagrid.
 */
export const MetadataList = ({
  items,
  layout = "vertical",
  columns = 1,
  copyable = false,
  labelWidth = "10rem",
  divided = false,
  labels,
  className,
  style,
  ...props
}: MetadataListProps): ReactElement => {
  const l = { ...defaultMetadataListLabels, ...labels };
  const horizontal = layout === "horizontal";
  return (
    <dl
      data-testid="metadata-list"
      data-layout={layout}
      className={cn("grid text-sm", COLUMNS[columns], horizontal ? "gap-x-8" : "gap-x-6 gap-y-4", className)}
      style={{ "--metadata-label-width": labelWidth, ...style } as CSSProperties}
      {...props}
    >
      {items.map((item, index) => {
        const empty = isEmpty(item.value);
        const copyText =
          item.copyValue ??
          (typeof item.value === "string" || typeof item.value === "number" ? String(item.value) : undefined);
        const showCopy = (item.copyable ?? copyable) && !empty && copyText != null && copyText !== "";
        const key = item.id ?? (typeof item.label === "string" ? item.label : String(index));
        return (
          <div
            key={key}
            data-testid="metadata-item"
            className={cn(
              "group/meta min-w-0",
              horizontal
                ? cn(
                    "grid grid-cols-[minmax(0,var(--metadata-label-width))_minmax(0,1fr)] items-baseline gap-x-4",
                    // Hairlines need air around them; without them rows sit closer, like a property sheet.
                    divided ? "py-2.5" : "py-1.5",
                  )
                : "flex flex-col gap-0.5",
              divided &&
                (horizontal ? "border-b border-foreground/10 dark:border-border" : "border-b border-foreground/10 pb-3 dark:border-border"),
              // One column: no dangling hairline under the last row (multi-column rows end unevenly, so keep them).
              divided && columns === 1 && (horizontal ? "last:border-b-0" : "last:border-b-0 last:pb-0"),
              item.fullWidth && FULL_SPAN[columns],
            )}
          >
            <dt className="min-w-0 text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd className="flex min-w-0 items-start gap-1.5 text-foreground">
              {empty ? (
                <span className="text-muted-foreground" data-testid="metadata-empty">
                  {l.empty}
                </span>
              ) : (
                <span className="min-w-0 break-words">{item.value}</span>
              )}
              {showCopy ? (
                <CopyButton
                  text={copyText}
                  label={typeof item.label === "string" ? `${l.copy} ${item.label}` : l.copy}
                  copiedLabel={l.copied}
                  failedLabel={l.copyFailed}
                />
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
};

const ICON =
  "col-start-1 row-start-1 h-3.5 w-3.5 transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-opacity";
const ICON_ON = "scale-100 opacity-100";
const ICON_OFF = "scale-50 opacity-0";

const CopyButton = ({
  text,
  label,
  copiedLabel,
  failedLabel,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  failedLabel: string;
}): ReactElement => {
  // useClipboard falls back to execCommand without navigator.clipboard (plain-http intranet) and never rejects.
  const { copy, copied, error, reset } = useClipboard({ timeout: 1500 });
  const failed = error !== null;
  useEffect(() => {
    if (!failed) return undefined;
    const handle = setTimeout(reset, 4000);
    return () => clearTimeout(handle);
  }, [failed, reset]);
  return (
    <button
      type="button"
      aria-label={label}
      title={failed ? failedLabel : undefined}
      data-testid="metadata-copy"
      data-state={failed ? "error" : copied ? "copied" : undefined}
      onClick={() => {
        void copy(text);
      }}
      className={cn(
        "-my-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-sm text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        copied || failed ? "opacity-100" : "opacity-0 group-hover/meta:opacity-100 pointer-coarse:opacity-100",
      )}
    >
      {/* All three icons share one grid cell; the active one scales/fades in (150ms
          ease-out) while the others shrink away — the clipboard morphs into a check. */}
      <ClipboardDocumentIcon aria-hidden="true" className={cn(ICON, failed || copied ? ICON_OFF : ICON_ON)} />
      <CheckIcon
        aria-hidden="true"
        data-testid={copied && !failed ? "metadata-copy-check" : undefined}
        className={cn(ICON, "text-emerald-600 dark:text-emerald-400", copied && !failed ? ICON_ON : ICON_OFF)}
      />
      <ExclamationTriangleIcon aria-hidden="true" className={cn(ICON, "text-destructive", failed ? ICON_ON : ICON_OFF)} />
      <span role="status" className="sr-only">
        {failed ? failedLabel : copied ? copiedLabel : ""}
      </span>
    </button>
  );
};
