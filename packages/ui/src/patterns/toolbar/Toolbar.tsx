import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  FocusEvent as ReactFocusEvent,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactElement,
  ReactNode,
  SVGProps,
} from "react";
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useIsomorphicLayoutEffect } from "../../lib/useIsomorphicLayoutEffect";
import { cn } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu";

export interface ToolbarLabels {
  /** Accessible name of the overflow ("…") button. */
  more: string;
}

export const defaultToolbarLabels: ToolbarLabels = { more: "More actions" };

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Name the toolbar for screen readers ("Text formatting"). */
  "aria-label"?: string;
  /** @default "horizontal" */
  orientation?: "horizontal" | "vertical";
  /** `outline` draws a bordered bar; `ghost` is just the row. @default "outline" */
  variant?: "outline" | "ghost";
  /**
   * Move `ToolbarButton`s that don't fit into a trailing "…" menu (horizontal only).
   * Only `ToolbarButton`s (and the separators between them) overflow; any other
   * child (a select, a wrapped button) always stays visible. @default false
   */
  overflow?: boolean;
  labels?: Partial<ToolbarLabels>;
}

const ITEM = "[data-toolbar-item]";

const OrientationContext = createContext<"horizontal" | "vertical">("horizontal");

function isFocusable(el: HTMLElement): boolean {
  return !(el as HTMLButtonElement).disabled && el.getAttribute("aria-disabled") !== "true" && !el.closest("[data-toolbar-hidden]");
}

/**
 * A row of related controls (formatting, view switches, bulk actions) that is
 * one Tab stop: `role="toolbar"` with a roving tabindex, arrow keys move
 * between items, Home/End jump to the ends. Use `ToolbarButton` and
 * `ToolbarSeparator` inside; any other control joins the arrow-key order when
 * it carries `data-toolbar-item`. With `overflow`, buttons that don't fit
 * collapse into a "…" menu. For a single-choice segmented control use
 * `ButtonGroup`; for a table's search/filter row use `TableToolbar`.
 */
export function Toolbar({
  orientation = "horizontal",
  variant = "outline",
  overflow = false,
  labels,
  className,
  children,
  onKeyDown,
  onFocus,
  ...props
}: ToolbarProps): ReactElement {
  const l = { ...defaultToolbarLabels, ...labels };
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  const vertical = orientation === "vertical";
  const useOverflow = overflow && !vertical;
  const items = Children.toArray(children);
  // Items at index >= cutoff that can overflow (ToolbarButton / ToolbarSeparator) are hidden.
  const [cutoff, setCutoff] = useState(items.length);
  /** Last measured width per slot; `undefined` = never measured while visible. */
  const widths = useRef<(number | undefined)[]>([]);
  const [measureKey, setMeasureKey] = useState(0);

  const ownItems = useCallback((): HTMLElement[] => {
    const root = rootRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(ITEM)).filter(
      (el) => el.closest('[role="toolbar"]') === root && isFocusable(el),
    );
  }, []);

  // Roving tabindex: exactly one item is tabbable. Runs after every render since children can change.
  useIsomorphicLayoutEffect(() => {
    const list = ownItems();
    const all = rootRef.current ? Array.from(rootRef.current.querySelectorAll<HTMLElement>(ITEM)) : [];
    const active = activeRef.current && list.includes(activeRef.current) ? activeRef.current : list[0];
    for (const el of all) el.tabIndex = el === active ? 0 : -1;
  });

  // Overflow: visible slots are re-measured on every fit; hidden ones keep their last width.
  // When a ToolbarButton's label/icon or the item list changes, show everything and measure again.
  const count = items.length;
  const overflowable = items.map(canOverflow);
  const signature = items.map(itemSignature).join("\u0000");
  useIsomorphicLayoutEffect(() => {
    if (!useOverflow) return;
    widths.current = [];
    setCutoff(count);
    setMeasureKey((k) => k + 1);
  }, [signature, count, useOverflow]);

  const overflowableRef = useRef(overflowable);
  overflowableRef.current = overflowable;
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!useOverflow || !root) return undefined;
    const fit = (): void => {
      const slots = Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-toolbar-slot]"));
      const style = window.getComputedStyle(root);
      const gap = Number.parseFloat(style.columnGap) || 0;
      const available = root.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0);
      // Not laid out (display: none, detached, jsdom): don't cache zero widths, show everything.
      if (available <= 0 || slots.length !== count) {
        setCutoff(count);
        return;
      }
      const ws = widths.current.length === count ? widths.current : Array.from({ length: count }, () => undefined);
      slots.forEach((slot, i) => {
        if (!slot.hasAttribute("data-toolbar-hidden")) ws[i] = slot.offsetWidth;
      });
      widths.current = ws;
      if (ws.some((w) => w === undefined)) {
        // A hidden slot was never measured: show all, then measure on the next pass.
        if (slots.some((slot) => slot.hasAttribute("data-toolbar-hidden"))) {
          setCutoff(count);
          setMeasureKey((k) => k + 1);
        }
        return;
      }
      const known = ws as number[];
      const flags = overflowableRef.current;
      const more = 32;
      const widthFor = (c: number): number => {
        let total = 0;
        let n = 0;
        let needsMore = false;
        for (let i = 0; i < count; i += 1) {
          if (i < c || !flags[i]) {
            total += known[i] ?? 0;
            n += 1;
          } else if (flags[i] === "button") needsMore = true;
        }
        if (needsMore) {
          total += more;
          n += 1;
        }
        return total + gap * Math.max(n - 1, 0);
      };
      let c = count;
      while (c > 0 && widthFor(c) > available) c -= 1;
      setCutoff(c);
    };
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    return () => observer.disconnect();
  }, [useOverflow, count, measureKey]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    const list = ownItems();
    const index = list.indexOf(target);
    if (index === -1) return;
    const prev = vertical ? "ArrowUp" : "ArrowLeft";
    const next = vertical ? "ArrowDown" : "ArrowRight";
    let to: number;
    if (event.key === next) to = (index + 1) % list.length;
    else if (event.key === prev) to = (index - 1 + list.length) % list.length;
    else if (event.key === "Home") to = 0;
    else if (event.key === "End") to = list.length - 1;
    else return;
    event.preventDefault();
    const el = list[to];
    if (!el) return;
    activeRef.current = el;
    for (const item of list) item.tabIndex = item === el ? 0 : -1;
    el.focus();
  };

  const handleFocus = (event: ReactFocusEvent<HTMLDivElement>): void => {
    onFocus?.(event);
    const target = (event.target as HTMLElement).closest<HTMLElement>(ITEM);
    if (!target || !ownItems().includes(target)) return;
    activeRef.current = target;
    for (const item of ownItems()) item.tabIndex = item === target ? 0 : -1;
  };

  const hiddenButtons = useOverflow
    ? items
        .slice(cutoff)
        .filter((c): c is ReactElement<ToolbarButtonProps> => isValidElement(c) && c.type === ToolbarButton)
    : [];
  // A separator right before the hidden buttons looks stranded; hide it with the overflow.
  let lastVisible = useOverflow ? cutoff : items.length;
  while (useOverflow && lastVisible < items.length && lastVisible > 0 && overflowable[lastVisible - 1] === "separator") {
    lastVisible -= 1;
  }
  const isHidden = (i: number): boolean => useOverflow && i >= lastVisible && Boolean(overflowable[i]);

  return (
    <OrientationContext.Provider value={orientation}>
    <div
      ref={rootRef}
      role="toolbar"
      aria-orientation={orientation}
      data-testid="toolbar"
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      className={cn(
        "flex min-w-0 gap-1",
        vertical ? "w-fit flex-col items-stretch" : "items-center",
        useOverflow ? "overflow-hidden" : !vertical && "flex-wrap",
        variant === "outline" && "rounded-lg border border-border bg-background p-1 shadow-sm",
        className,
      )}
      {...props}
    >
      {useOverflow
        ? items.map((child, i) => (
            <div
              key={isValidElement(child) && child.key != null ? child.key : i}
              data-toolbar-slot=""
              data-toolbar-hidden={isHidden(i) ? "" : undefined}
              className={cn("flex shrink-0 items-center self-stretch", isHidden(i) && "hidden")}
            >
              {child}
            </div>
          ))
        : children}
      {hiddenButtons.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            data-toolbar-item=""
            aria-label={l.more}
            title={l.more}
            data-testid="toolbar-more"
            className={cn(toolbarButtonClass, "w-8 px-0")}
          >
            <EllipsisHorizontalIcon className="h-4 w-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hiddenButtons.map((button, i) => {
              const { label, icon: Icon, onClick, disabled, pressed } = button.props;
              const content = (
                <>
                  {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
                  {label}
                </>
              );
              return pressed === undefined ? (
                <DropdownMenuItem key={button.key ?? i} disabled={disabled} onSelect={() => onClick?.()}>
                  {content}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuCheckboxItem key={button.key ?? i} disabled={disabled} checked={pressed} onSelect={() => onClick?.()}>
                  {content}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
    </OrientationContext.Provider>
  );
}

/** Which children may move into the "…" menu: only `ToolbarButton`s (and separators between them). */
function canOverflow(child: ReturnType<typeof Children.toArray>[number]): "button" | "separator" | false {
  if (!isValidElement(child)) return false;
  if (child.type === ToolbarButton) return "button";
  if (child.type === ToolbarSeparator) return "separator";
  return false;
}

/** Changes whenever a slot's measured width may have changed for a reason we can see in props. */
function itemSignature(child: ReturnType<typeof Children.toArray>[number]): string {
  if (!isValidElement(child)) return `text:${String(child)}`;
  if (child.type === ToolbarButton) {
    const { label, showLabel, icon } = child.props as ToolbarButtonProps;
    return `button:${String(child.key)}:${label}:${showLabel ? 1 : 0}:${icon ? 1 : 0}`;
  }
  const type = child.type as string | { displayName?: string; name?: string };
  return `el:${String(child.key)}:${typeof type === "string" ? type : (type.displayName ?? type.name ?? "")}`;
}

const toolbarButtonClass =
  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-foreground/[0.09] aria-pressed:text-foreground dark:hover:bg-foreground/10 dark:aria-pressed:bg-foreground/15 [&_svg]:size-4 [&_svg]:shrink-0";

export interface ToolbarButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children"> {
  /** Accessible name, tooltip, and the text in the overflow menu. */
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Show `label` next to the icon. Always shown when there's no icon. */
  showLabel?: boolean;
  /** Makes it a toggle button (`aria-pressed`), e.g. Bold. */
  pressed?: boolean;
  /** Called on click, and when picked from the overflow menu (then without an event). */
  onClick?: (event?: ReactMouseEvent<HTMLButtonElement>) => void;
  /** Extra content after the label (a count badge, a chevron). */
  children?: ReactNode;
}

/** Icon (and/or text) button for a `Toolbar`; joins its arrow-key order and its overflow menu. */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ label, icon: Icon, showLabel, pressed, onClick, className, children, ...props }, ref) => {
    const textVisible = showLabel || !Icon;
    return (
      <button
        ref={ref}
        type="button"
        data-toolbar-item=""
        aria-label={textVisible ? undefined : label}
        title={textVisible ? undefined : label}
        aria-pressed={pressed}
        onClick={(event) => onClick?.(event)}
        className={cn(toolbarButtonClass, !textVisible && "w-8 px-0", className)}
        {...props}
      >
        {Icon ? <Icon aria-hidden="true" /> : null}
        {textVisible ? <span>{label}</span> : null}
        {children}
      </button>
    );
  },
);
ToolbarButton.displayName = "ToolbarButton";

/** Thin divider between groups of `Toolbar` items. */
export function ToolbarSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
  const toolbarOrientation = useContext(OrientationContext);
  const vertical = toolbarOrientation === "vertical";
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "horizontal" : "vertical"}
      data-testid="toolbar-separator"
      className={cn("shrink-0 bg-border", vertical ? "mx-1 my-1 h-px" : "mx-1 my-1.5 w-px self-stretch", className)}
      {...props}
    />
  );
}
