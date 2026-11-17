import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Checkbox } from "../../primitives/checkbox";

export interface TreeViewNode {
  id: string;
  /** Plain text: used for the default rendering, typeahead and `title`. */
  label: string;
  icon?: ReactNode;
  /** Already-known children. Omit for a lazy branch and set `hasChildren` instead. */
  children?: TreeViewNode[];
  /** Marks a branch whose children are not loaded yet (`onLoadChildren` fetches them on first expand). */
  hasChildren?: boolean;
  disabled?: boolean;
}

export interface TreeViewNodeState {
  level: number;
  expanded: boolean;
  selected: boolean;
  checked: boolean | "indeterminate";
  loading: boolean;
  error: boolean;
  isBranch: boolean;
}

export interface TreeViewLabels {
  loading: string;
  loadFailed: string;
  retry: string;
  empty: string;
}

export const defaultTreeViewLabels: TreeViewLabels = {
  loading: "Loading…",
  loadFailed: "Could not load",
  retry: "Retry",
  empty: "No items",
};

export interface TreeViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect" | "defaultValue"> {
  nodes: TreeViewNode[];
  /** Controlled expanded node ids. */
  expandedIds?: string[];
  defaultExpandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  /** `none` (default): rows are only expandable/activatable. `checkable` implies `multiple`. */
  selectionMode?: "none" | "single" | "multiple";
  /** Checkbox per row with tri-state parents (derived from loaded children). Selected ids hold the checked nodes. */
  checkable?: boolean;
  /** Controlled selected (or checked) node ids. */
  selectedIds?: string[];
  defaultSelectedIds?: string[];
  onSelectedChange?: (ids: string[]) => void;
  /** Click on a row (or Enter): open a page, show details. Fires in every selection mode. */
  onActivate?: (node: TreeViewNode) => void;
  /** Lazy children: called on the first expand of a branch without `children`. Rejecting shows an error row with Retry. */
  onLoadChildren?: (node: TreeViewNode) => Promise<TreeViewNode[]>;
  /** Replaces the icon + label content of a row. */
  renderNode?: (node: TreeViewNode, state: TreeViewNodeState) => ReactNode;
  labels?: Partial<TreeViewLabels>;
  /** Indent per level in px. Default 16. */
  indent?: number;
  /** Fades new rows in and rotates the chevron. Default true. */
  animated?: boolean;
  "aria-label"?: string;
}

type NodeRow = {
  kind: "node";
  node: TreeViewNode;
  level: number;
  setSize: number;
  posInSet: number;
  parentId: string | null;
  isBranch: boolean;
  expanded: boolean;
};
type Row = NodeRow | { kind: "loading" | "error"; id: string; level: number };

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set];
}

/**
 * Standalone tree following the WAI-ARIA tree pattern: roving tabindex, Up/Down/Left/Right/Home/End,
 * Enter/Space, `*` (expand siblings) and typeahead. Optional single/multiple selection or tri-state
 * checkboxes, and lazy children with a loading and an error + retry row.
 */
export const TreeView = forwardRef<HTMLDivElement, TreeViewProps>(function TreeView(
  {
    nodes,
    expandedIds,
    defaultExpandedIds,
    onExpandedChange,
    selectionMode = "none",
    checkable = false,
    selectedIds,
    defaultSelectedIds,
    onSelectedChange,
    onActivate,
    onLoadChildren,
    renderNode,
    labels,
    indent = 16,
    animated = true,
    className,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const l = { ...defaultTreeViewLabels, ...labels };
  const mode = checkable ? "multiple" : selectionMode;
  const [expanded, setExpanded] = useControllable(expandedIds, defaultExpandedIds ?? [], onExpandedChange);
  const [selected, setSelected] = useControllable(selectedIds, defaultSelectedIds ?? [], onSelectedChange);
  const [loaded, setLoaded] = useState<Record<string, TreeViewNode[]>>({});
  const [loadingIds, setLoadingIds] = useState<ReadonlySet<string>>(new Set());
  const [errorIds, setErrorIds] = useState<ReadonlySet<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(true);
  const requested = useRef<Set<string>>(new Set());
  const typed = useRef<{ text: string; timer: ReturnType<typeof setTimeout> | undefined }>({ text: "", timer: undefined });

  useEffect(() => {
    mounted.current = true;
    const t = typed.current;
    return () => {
      mounted.current = false;
      clearTimeout(t.timer);
    };
  }, []);

  const childrenOf = useCallback((node: TreeViewNode): TreeViewNode[] | undefined => node.children ?? loaded[node.id], [loaded]);
  const isBranch = useCallback(
    (node: TreeViewNode): boolean => node.hasChildren === true || (childrenOf(node)?.length ?? 0) > 0,
    [childrenOf],
  );

  const expandedSet = useMemo(() => new Set(expanded), [expanded]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // id -> node and parent, over everything currently known.
  const index = useMemo(() => {
    const map = new Map<string, { node: TreeViewNode; parentId: string | null }>();
    const walk = (list: TreeViewNode[], parentId: string | null): void => {
      for (const node of list) {
        map.set(node.id, { node, parentId });
        const kids = node.children ?? loaded[node.id];
        if (kids) walk(kids, node.id);
      }
    };
    walk(nodes, null);
    return map;
  }, [nodes, loaded]);

  const rows = useMemo(() => {
    const out: Row[] = [];
    const walk = (list: TreeViewNode[], level: number, parentId: string | null): void => {
      list.forEach((node, i) => {
        const branch = isBranch(node);
        const open = branch && expandedSet.has(node.id);
        out.push({ kind: "node", node, level, setSize: list.length, posInSet: i + 1, parentId, isBranch: branch, expanded: open });
        if (!open) return;
        const kids = childrenOf(node);
        if (kids) walk(kids, level + 1, node.id);
        else if (loadingIds.has(node.id)) out.push({ kind: "loading", id: node.id, level: level + 1 });
        else if (errorIds.has(node.id)) out.push({ kind: "error", id: node.id, level: level + 1 });
      });
    };
    walk(nodes, 1, null);
    return out;
  }, [nodes, expandedSet, loadingIds, errorIds, childrenOf, isBranch]);

  const nodeRows = useMemo(() => rows.filter((r): r is NodeRow => r.kind === "node"), [rows]);

  const load = useCallback(
    (node: TreeViewNode): void => {
      if (!onLoadChildren) return;
      requested.current.add(node.id);
      setErrorIds((prev) => {
        if (!prev.has(node.id)) return prev;
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
      setLoadingIds((prev) => new Set(prev).add(node.id));
      const finish = (): void =>
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
      onLoadChildren(node).then(
        (kids) => {
          if (!mounted.current) return;
          setLoaded((prev) => ({ ...prev, [node.id]: kids }));
          finish();
        },
        () => {
          if (!mounted.current) return;
          setErrorIds((prev) => new Set(prev).add(node.id));
          finish();
        },
      );
    },
    [onLoadChildren],
  );

  // Lazy branches load as soon as they are open, however they got opened (click, key, defaultExpandedIds).
  useEffect(() => {
    if (!onLoadChildren) return;
    for (const row of nodeRows) {
      const { node } = row;
      if (!row.expanded || node.children || loaded[node.id]) continue;
      if (requested.current.has(node.id) || loadingIds.has(node.id) || errorIds.has(node.id)) continue;
      load(node);
    }
  }, [nodeRows, loaded, loadingIds, errorIds, load, onLoadChildren]);

  // ---- selection ----
  const checkState = useCallback(
    (node: TreeViewNode, set: ReadonlySet<string>): boolean | "indeterminate" => {
      const kids = (childrenOf(node) ?? []).filter((k) => !k.disabled);
      if (kids.length === 0) return set.has(node.id);
      const states = kids.map((k) => checkState(k, set));
      if (states.every((s) => s === true)) return true;
      if (states.every((s) => s === false)) return false;
      return "indeterminate";
    },
    [childrenOf],
  );

  const toggleChecked = (node: TreeViewNode): void => {
    const next = new Set(selectedSet);
    const target = checkState(node, selectedSet) !== true;
    const apply = (n: TreeViewNode): void => {
      if (n.disabled) return;
      if (target) next.add(n.id);
      else next.delete(n.id);
      for (const k of childrenOf(n) ?? []) apply(k);
    };
    apply(node);
    let parentId = index.get(node.id)?.parentId ?? null;
    while (parentId !== null) {
      const parent = index.get(parentId);
      if (!parent) break;
      if (checkState(parent.node, next) === true) next.add(parentId);
      else next.delete(parentId);
      parentId = parent.parentId;
    }
    setSelected([...next]);
  };

  const select = (node: TreeViewNode): void => {
    if (node.disabled) return;
    if (checkable) toggleChecked(node);
    else if (mode === "single") {
      if (!selectedSet.has(node.id) || selected.length !== 1) setSelected([node.id]);
    } else if (mode === "multiple") {
      setSelected(selectedSet.has(node.id) ? selected.filter((id) => id !== node.id) : [...selected, node.id]);
    }
  };

  // ---- expansion ----
  const setOpen = (id: string, open: boolean): void => {
    if (open === expandedSet.has(id)) return;
    setExpanded(open ? [...expanded, id] : expanded.filter((x) => x !== id));
  };

  const retry = (id: string): void => {
    const node = index.get(id)?.node;
    if (node) load(node);
  };

  // ---- focus ----
  const effectiveActive =
    activeId !== null && nodeRows.some((r) => r.node.id === activeId)
      ? activeId
      : (nodeRows.find((r) => selectedSet.has(r.node.id))?.node.id ?? nodeRows[0]?.node.id ?? null);

  const focusNode = (id: string): void => {
    setActiveId(id);
    const items = Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []);
    items.find((item) => item.dataset.nodeId === id)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    const id = target.dataset?.nodeId;
    if (target.getAttribute("role") !== "treeitem" || !id) return;
    const pos = nodeRows.findIndex((r) => r.node.id === id);
    const row = nodeRows[pos];
    if (!row) return;
    const { node } = row;
    const key = event.key;
    const go = (r: NodeRow | undefined): void => {
      event.preventDefault();
      if (r) focusNode(r.node.id);
    };
    if (key === "ArrowDown") return go(nodeRows[pos + 1]);
    if (key === "ArrowUp") return go(nodeRows[pos - 1]);
    if (key === "Home") return go(nodeRows[0]);
    if (key === "End") return go(nodeRows[nodeRows.length - 1]);
    if (key === "ArrowRight") {
      event.preventDefault();
      if (!row.isBranch || node.disabled) return;
      if (errorIds.has(node.id)) retry(node.id);
      else if (!row.expanded) setOpen(node.id, true);
      else {
        const nextRow = nodeRows[pos + 1];
        if (nextRow?.parentId === node.id) focusNode(nextRow.node.id);
      }
      return;
    }
    if (key === "ArrowLeft") {
      event.preventDefault();
      if (row.expanded && !node.disabled) setOpen(node.id, false);
      else if (row.parentId !== null) focusNode(row.parentId);
      return;
    }
    if (key === "*") {
      event.preventDefault();
      const siblings = nodeRows.filter((r) => r.parentId === row.parentId && r.isBranch && !r.node.disabled);
      const add = siblings.filter((r) => !expandedSet.has(r.node.id)).map((r) => r.node.id);
      if (add.length > 0) setExpanded([...expanded, ...add]);
      return;
    }
    if (key === " " || key === "Enter") {
      event.preventDefault();
      if (node.disabled) return;
      if (mode !== "none") select(node);
      else if (key === "Enter" && row.isBranch) setOpen(node.id, !row.expanded);
      if (key === "Enter") onActivate?.(node);
      return;
    }
    // Typeahead: printable characters build a prefix; a lone or repeated letter cycles from the next row.
    if (key.length === 1) {
      const t = typed.current;
      clearTimeout(t.timer);
      t.text += key.toLowerCase();
      t.timer = setTimeout(() => {
        t.text = "";
      }, 500);
      const repeated = t.text.split("").every((c) => c === t.text[0]);
      const needle = repeated ? t.text.slice(0, 1) : t.text;
      const start = repeated ? pos + 1 : pos;
      const order = [...nodeRows.slice(start), ...nodeRows.slice(0, start)];
      const hit = order.find((r) => !r.node.disabled && r.node.label.toLowerCase().startsWith(needle));
      if (hit) focusNode(hit.node.id);
    }
  };

  const setRefs = (el: HTMLDivElement | null): void => {
    containerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  if (nodes.length === 0) {
    return (
      <p className={cn("p-2 text-sm text-muted-foreground", className)} data-slot="tree-view-empty">
        {l.empty}
      </p>
    );
  }

  const fade = animated ? "transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none" : "";

  return (
    <div
      ref={setRefs}
      role="tree"
      aria-multiselectable={mode === "multiple" && !checkable ? true : undefined}
      data-slot="tree-view"
      className={cn("flex min-w-0 flex-col text-sm", className)}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {rows.map((row) => {
        if (row.kind !== "node") {
          const pad = { paddingLeft: `${(row.level - 1) * indent + 4}px` };
          return (
            <div key={`${row.kind}-${row.id}`} role="none" style={pad} className={cn("flex min-h-8 items-center gap-2 py-1 pr-2", fade)}>
              <span className="size-6 shrink-0" aria-hidden />
              {row.kind === "loading" ? (
                <span role="status" className="text-muted-foreground">
                  {l.loading}
                </span>
              ) : (
                <>
                  <span role="alert" className="min-w-0 break-words text-red-700 dark:text-red-300">
                    {l.loadFailed}
                  </span>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => retry(row.id)}
                    className="shrink-0 rounded-md px-2 py-1 font-medium underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11"
                  >
                    {l.retry}
                  </button>
                </>
              )}
            </div>
          );
        }
        const { node } = row;
        const isChecked = checkable ? checkState(node, selectedSet) : false;
        const isSelected = !checkable && mode !== "none" && selectedSet.has(node.id);
        const state: TreeViewNodeState = {
          level: row.level,
          expanded: row.expanded,
          selected: isSelected,
          checked: isChecked,
          loading: loadingIds.has(node.id),
          error: errorIds.has(node.id),
          isBranch: row.isBranch,
        };
        return (
          <div
            key={node.id}
            role="treeitem"
            data-node-id={node.id}
            data-state={isSelected ? "selected" : undefined}
            tabIndex={node.id === effectiveActive ? 0 : -1}
            aria-level={row.level}
            aria-setsize={row.setSize}
            aria-posinset={row.posInSet}
            aria-expanded={row.isBranch ? row.expanded : undefined}
            aria-selected={checkable || mode === "none" ? undefined : isSelected}
            aria-checked={checkable ? (isChecked === "indeterminate" ? "mixed" : isChecked) : undefined}
            aria-disabled={node.disabled || undefined}
            aria-busy={state.loading || undefined}
            onFocus={(e) => {
              if (e.target === e.currentTarget) setActiveId(node.id);
            }}
            onClick={(e) => {
              // Controls rendered by `renderNode` (buttons, links, menus) handle their own clicks.
              const inner = (e.target as HTMLElement).closest?.("button, a, input, select, textarea, [role=menuitem]");
              if (inner && inner !== e.currentTarget && e.currentTarget.contains(inner)) return;
              setActiveId(node.id);
              if (node.disabled) return;
              if (mode !== "none") select(node);
              else if (row.isBranch) setOpen(node.id, !row.expanded);
              onActivate?.(node);
            }}
            style={{ paddingLeft: `${(row.level - 1) * indent + 4}px` }}
            className={cn(
              "flex min-h-8 min-w-0 cursor-default select-none items-center gap-1 rounded-md pr-2 outline-none pointer-coarse:min-h-11",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              "hover:bg-foreground/6",
              isSelected && "bg-primary/15 dark:bg-ring/25",
              node.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
              fade,
            )}
          >
            <span
              aria-hidden
              className={cn("flex size-6 shrink-0 items-center justify-center text-muted-foreground", row.isBranch && !node.disabled && "cursor-pointer")}
              onClick={(e) => {
                if (!row.isBranch || node.disabled) return;
                e.stopPropagation();
                setActiveId(node.id);
                setOpen(node.id, !row.expanded);
              }}
            >
              {row.isBranch && (
                <ChevronRightIcon
                  className={cn("size-4", animated && "transition-transform duration-150 ease-out motion-reduce:transition-none", row.expanded && "rotate-90")}
                />
              )}
            </span>
            {checkable && (
              <Checkbox
                aria-hidden
                tabIndex={-1}
                checked={isChecked}
                disabled={node.disabled}
                className="pointer-events-none mr-1 shrink-0"
              />
            )}
            <span className="flex min-w-0 flex-1 items-center gap-2 py-1">
              {renderNode ? (
                renderNode(node, state)
              ) : (
                <>
                  {node.icon && (
                    <span aria-hidden className="flex shrink-0 items-center text-muted-foreground [&_svg]:size-4">
                      {node.icon}
                    </span>
                  )}
                  <span className="min-w-0 break-words" title={node.label}>
                    {node.label}
                  </span>
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
});
TreeView.displayName = "TreeView";
