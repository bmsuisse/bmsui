import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { type HTMLAttributes, type ReactElement, useMemo, useState } from "react";
import { FoldPanel } from "../../lib/FoldPanel";
import { SCROLL_FOCUS_WRAPPER, SCROLL_REGION, useScrollFade } from "../../lib/scrollFade";
import { cn } from "../../lib/utils";
import { Collapsible, CollapsibleTrigger } from "../../primitives/collapsible";
import { CopyIconButton, type CopyIconButtonLabels, defaultCopyIconButtonLabels } from "../code-block/CopyIconButton";

export interface JsonViewLabels extends CopyIconButtonLabels {
  /** "3 keys" / "1 key". */
  keys: (n: number) => string;
  /** "2 items" / "1 item" for arrays. */
  items: (n: number) => string;
}

export const defaultJsonViewLabels: JsonViewLabels = {
  ...defaultCopyIconButtonLabels,
  keys: (n) => `${n} ${n === 1 ? "key" : "keys"}`,
  items: (n) => `${n} ${n === 1 ? "item" : "items"}`,
};

export interface JsonViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "defaultValue"> {
  /** Any JSON-serialisable value; circular or unserialisable values fall back to `String(value)`. */
  value: unknown;
  /** Header text. @default "JSON" */
  label?: string;
  /** @default true */
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Cap for the scrolling body, px or CSS length. @default 256 */
  maxHeight?: number | string;
  labels?: Partial<JsonViewLabels>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function serialise(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "null";
  } catch {
    return String(value);
  }
}

/**
 * Collapsible, pretty-printed JSON for payloads in admin and chat UIs (API responses, tool
 * arguments): header with key/item count, size and copy; body scrolls past `maxHeight`.
 * Same frame as `CodeBlock`. Not a tree explorer: the text is plain and selectable.
 */
export const JsonView = ({
  value,
  label = "JSON",
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  maxHeight = 256,
  labels,
  className,
  ...props
}: JsonViewProps): ReactElement => {
  const l = { ...defaultJsonViewLabels, ...labels };
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const fade = useScrollFade<HTMLDivElement>();
  const text = useMemo(() => serialise(value), [value]);
  const size = formatBytes(new TextEncoder().encode(text).length);
  const count = Array.isArray(value)
    ? l.items(value.length)
    : value && typeof value === "object"
      ? l.keys(Object.keys(value).length)
      : null;
  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => {
        if (openProp === undefined) setUncontrolled(next);
        onOpenChange?.(next);
      }}
      data-slot="json-view"
      className={cn(
        "min-w-0 max-w-full overflow-hidden rounded-lg border border-foreground/10 bg-foreground/[0.03] dark:border-border dark:bg-foreground/[0.06]",
        className,
      )}
      {...props}
    >
      <div className={cn("flex min-h-9 items-center gap-1 px-1", open && "border-b border-foreground/10 dark:border-border")}>
        <CollapsibleTrigger className="group/jv flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronRightIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-out group-data-[state=open]/jv:rotate-90 motion-reduce:transition-none"
          />
          <span className="min-w-0 [overflow-wrap:anywhere] text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="ml-auto shrink-0 pl-2 text-[11px] tabular-nums text-muted-foreground">
            {count ? `${count} · ` : ""}
            {size}
          </span>
        </CollapsibleTrigger>
        <CopyIconButton value={text} labels={l} label={`${l.copy} ${label}`} testId="json-view-copy" />
      </div>
      <FoldPanel open={open}>
        <div className={SCROLL_FOCUS_WRAPPER}>
          <div
            ref={fade.ref}
            tabIndex={open ? 0 : -1}
            role="region"
            aria-label={label}
            style={{ maxHeight, ...fade.style }}
            className={cn("overflow-auto", SCROLL_REGION)}
          >
            <pre className="m-0 min-w-fit whitespace-pre p-3 font-mono text-xs leading-5">{text}</pre>
          </div>
        </div>
      </FoldPanel>
    </Collapsible>
  );
};
