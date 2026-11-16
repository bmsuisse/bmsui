import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { KeyboardEvent, ReactElement } from "react";
import { useId, useMemo, useRef, useState } from "react";

export interface TreeSelectNode {
  value: string;
  label: string;
  children: TreeSelectNode[];
}

export interface TreeSelectProps {
  id?: string;
  nodes: TreeSelectNode[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  /** Text shown in the list and on the trigger while `loading` is true. Defaults to `"Loading…"`. */
  loadingMessage?: string;
  disabled?: boolean;
  /** Displays a saved value absent from nodes without adding it to the choices. */
  valueLabel?: string | null;
  /** Text shown instead of the tree when loading failed. */
  errorMessage?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  "data-testid"?: string;
}

function findLabel(nodes: TreeSelectNode[], value: string): string | null {
  for (const node of nodes) {
    if (node.value === value) return node.label;
    const inChildren = findLabel(node.children, value);
    if (inChildren !== null) return inChildren;
  }
  return null;
}

/** Keeps the nodes that match the query or have a matching descendant. */
function filterTree(nodes: TreeSelectNode[], query: string): TreeSelectNode[] {
  return nodes.flatMap((node) => {
    const children = filterTree(node.children, query);
    if (children.length === 0 && !node.label.toLowerCase().includes(query)) {
      return [];
    }
    return [{ ...node, children }];
  });
}

/** First node in display order whose own label matches the query. */
function firstMatch(
  nodes: TreeSelectNode[],
  query: string,
): TreeSelectNode | null {
  for (const node of nodes) {
    if (node.label.toLowerCase().includes(query)) return node;
    const inChildren = firstMatch(node.children, query);
    if (inChildren) return inChildren;
  }
  return null;
}

/** Values of the ancestors of `value`, so the selection is visible when the picker opens. */
function ancestorsOf(nodes: TreeSelectNode[], value: string | null): string[] {
  if (value === null) return [];
  for (const node of nodes) {
    if (node.value === value) return [];
    const inChildren = ancestorsOf(node.children, value);
    if (inChildren.length > 0 || node.children.some((c) => c.value === value)) {
      return [node.value, ...inChildren];
    }
  }
  return [];
}

interface TreeRowsProps {
  nodes: TreeSelectNode[];
  depth: number;
  activeValue: string | undefined;
  value: string | null;
  expanded: ReadonlySet<string>;
  forceExpanded: boolean;
  onToggle: (value: string) => void;
  onSelect: (value: string) => void;
  testId: string | undefined;
}

function TreeRows({
  nodes,
  depth,
  activeValue,
  value,
  expanded,
  forceExpanded,
  onToggle,
  onSelect,
  testId,
}: TreeRowsProps): ReactElement {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isOpen =
          hasChildren && (forceExpanded || expanded.has(node.value));
        const selected = node.value === value;
        return (
          <div key={node.value}>
            <div
              className="flex items-center gap-1 rounded-sm hover:bg-accent"
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={node.label}
                  tabIndex={-1}
                  aria-expanded={isOpen}
                  className="flex size-11 shrink-0 items-center justify-center text-muted-foreground sm:size-6"
                  onClick={() => onToggle(node.value)}
                >
                  {isOpen ? (
                    <ChevronDownIcon className="size-4" />
                  ) : (
                    <ChevronRightIcon className="size-4" />
                  )}
                </button>
              ) : (
                <span className="size-11 shrink-0 sm:size-6" />
              )}
              <button
                type="button"
                role="treeitem"
                tabIndex={node.value === activeValue ? 0 : -1}
                aria-level={depth + 1}
                aria-selected={selected}
                aria-expanded={hasChildren ? isOpen : undefined}
                data-value={node.value}
                data-testid={
                  testId ? `${testId}-option-${node.value}` : undefined
                }
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-1 pr-2 text-left text-sm sm:min-h-0"
                onClick={() => onSelect(node.value)}
              >
                <span className="min-w-0 break-words whitespace-normal sm:truncate" title={node.label}>{node.label}</span>
                {selected && <CheckIcon className="ml-auto size-4 shrink-0" />}
              </button>
            </div>
            {isOpen && (
              <TreeRows
                nodes={node.children}
                depth={depth + 1}
                activeValue={activeValue}
                value={value}
                expanded={expanded}
                forceExpanded={forceExpanded}
                onToggle={onToggle}
                onSelect={onSelect}
                testId={testId}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

/** Single-select dropdown over a hierarchy: expand/collapse per node, search keeps matching nodes with their ancestors. */
export function TreeSelect({
  id,
  nodes,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches.",
  valueLabel = null,
  disabled = false,
  loading = false,
  loadingMessage = "Loading…",
  errorMessage = null,
  onRetry,
  retryLabel = "Retry",
  "data-testid": testId,
}: TreeSelectProps): ReactElement {
  const treeId = useId();
  const treeRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<string | null>(value);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const normalizedQuery = query.trim().toLowerCase();
  const visibleNodes = useMemo(
    () => (normalizedQuery ? filterTree(nodes, normalizedQuery) : nodes),
    [nodes, normalizedQuery],
  );
  const selectedLabel = value === null ? null : (findLabel(nodes, value) ?? valueLabel);

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) return;
    setQuery("");
    setActiveValue(value ?? nodes[0]?.value ?? null);
    setExpanded(new Set(ancestorsOf(nodes, value)));
  }

  function toggle(nodeValue: string): void {
    setActiveValue(nodeValue);
    const next = new Set(expanded);
    if (!next.delete(nodeValue)) next.add(nodeValue);
    setExpanded(next);
  }

  function select(nodeValue: string): void {
    onChange(nodeValue);
    setOpen(false);
  }

  function handleTreeKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const items = Array.from(treeRef.current?.querySelectorAll<HTMLButtonElement>('[role="treeitem"]') ?? []);
    const index = items.findIndex((item) => item === event.target);
    const item = items[index];
    if (!item) return;
    const key = event.key;
    if (!["ArrowDown", "ArrowUp", "Home", "End", "ArrowLeft", "ArrowRight"].includes(key)) return;
    event.preventDefault();
    if (key === "ArrowDown") items[Math.min(index + 1, items.length - 1)]?.focus();
    if (key === "ArrowUp") items[Math.max(index - 1, 0)]?.focus();
    if (key === "Home") items[0]?.focus();
    if (key === "End") items[items.length - 1]?.focus();
    const nodeValue = item.dataset.value;
    const isExpanded = item.getAttribute("aria-expanded");
    if (key === "ArrowRight") {
      if (isExpanded === "false" && nodeValue) toggle(nodeValue);
      else if (isExpanded === "true") items[index + 1]?.focus();
    }
    if (key === "ArrowLeft") {
      if (isExpanded === "true" && !normalizedQuery && nodeValue) toggle(nodeValue);
      else {
        const level = Number(item.getAttribute("aria-level"));
        items.slice(0, index).reverse().find((candidate) => Number(candidate.getAttribute("aria-level")) < level)?.focus();
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          aria-haspopup="tree"
          aria-controls={open ? treeId : undefined}
          aria-expanded={open}
          aria-busy={loading || undefined}
          className="w-full justify-between font-normal"
          data-testid={testId}
        >
          <span
            className={selectedLabel ? "truncate" : "text-muted-foreground"}
          >
            {loading && !selectedLabel ? loadingMessage : (selectedLabel ?? placeholder)}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-2"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <Input
          ref={searchRef}
          value={query}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveValue(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
            if (errorMessage || loading) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              const selected = treeRef.current?.querySelector<HTMLElement>('[role="treeitem"][aria-selected="true"]');
              (selected ?? treeRef.current?.querySelector<HTMLElement>('[role="treeitem"]'))?.focus();
              return;
            }
            if (e.key !== "Enter" || !normalizedQuery) return;
            e.preventDefault();
            const match = firstMatch(visibleNodes, normalizedQuery);
            if (match) select(match.value);
          }}
          data-testid={testId ? `${testId}-search` : undefined}
        />
        <div
          ref={treeRef}
          id={treeId}
          role="tree"
          aria-label={placeholder}
          aria-busy={loading}
          onKeyDown={handleTreeKeyDown}
          onFocusCapture={(event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.dataset.value) setActiveValue(target.dataset.value);
          }}
          className="mt-2 max-h-64 overflow-y-auto"
          data-testid={testId ? `${testId}-tree` : undefined}
        >
          {errorMessage ? (
            <div className="flex flex-col items-start gap-2 p-2 text-sm">
              <span className="text-red-700 dark:text-red-300">{errorMessage}</span>
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  {retryLabel}
                </Button>
              )}
            </div>
          ) : visibleNodes.length === 0 ? (
            <p className="p-2 text-muted-foreground text-sm">
              {loading ? loadingMessage : emptyMessage}
            </p>
          ) : (
            <TreeRows
              nodes={visibleNodes}
              depth={0}
              activeValue={activeValue !== null && findLabel(visibleNodes, activeValue) !== null ? activeValue : visibleNodes[0]?.value}
              value={value}
              expanded={expanded}
              forceExpanded={normalizedQuery !== ""}
              onToggle={toggle}
              onSelect={select}
              testId={testId}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
