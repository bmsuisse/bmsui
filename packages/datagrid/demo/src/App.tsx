import type { ColumnDef, ColumnVisibility, DataSource, EditedRow, GridState, NumberColumn } from "@bmsuisse/datagrid";
import {
  ColumnSelector,
  DataGrid,
  facetedNumberValues,
  NumberComparisonFilter,
  NumberHistogramFilter,
  TreeDataGrid,
} from "@bmsuisse/datagrid";
import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface Order {
  id: string;
  customer_name: string;
  status: string;
  amount: number;
  is_paid: boolean;
  created_at: string;
}

// `group` only matters to <ColumnSelector> (see AGENTS.md) — grouped here so
// the selector's grouped-sections behavior is actually visible in the demo:
// "Details" for the order's own identity/lifecycle fields, "Account" for
// the customer-facing field, "Financial" for money-related fields. Neither
// "Details" nor "Account" matches one of its own columns' `header` (id's
// header is "Order", customer_name's is "Customer") — a group named the
// same as one of its own columns reads as a confusing duplicate in the
// selector (see AGENTS.md's <ColumnSelector> section).
const columns: ColumnDef<Order>[] = [
  { id: "id", type: "string", header: "Order", accessorKey: "id", group: "Details" },
  {
    id: "customer_name",
    type: "string",
    header: "Customer",
    accessorKey: "customer_name",
    sortable: true,
    filterable: true,
    group: "Account",
  },
  {
    id: "status",
    type: "enum",
    header: "Status",
    accessorKey: "status",
    sortable: true,
    filterable: true,
    group: "Details",
    options: [
      { value: "pending", label: "Pending" },
      { value: "shipped", label: "Shipped" },
      { value: "delivered", label: "Delivered" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  {
    id: "amount",
    type: "currency",
    header: "Amount",
    accessorKey: "amount",
    sortable: true,
    filterable: true,
    group: "Financial",
  },
  {
    id: "is_paid",
    type: "boolean",
    header: "Paid",
    accessorKey: "is_paid",
    sortable: true,
    filterable: true,
    group: "Financial",
  },
  {
    id: "created_at",
    type: "date",
    header: "Created",
    accessorKey: "created_at",
    sortable: true,
    filterable: true,
    group: "Details",
  },
];

type Engine = "sql" | "meili";

const DEFAULT_GRID_STATE: GridState = { filter: null, sort: [], page: 0, pageSize: 20 };

// Set at build time (`bun run build:static`, see package.json) for the
// public GitHub Pages demo, which has no e2e/server FastAPI backend to talk
// to — swaps the orders grid over to a bundled, fully client-side dataset
// instead of fetching. Unset (the default `bun run dev`/`bun run build`,
// which is what Playwright drives) behaves exactly as before.
const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === "true";

/** Deterministic (no Math.random, so screenshots are reproducible) synthetic dataset for the static demo build. */
const STATIC_CUSTOMERS = [
  "Acme Corp",
  "Globex",
  "Initech",
  "Umbrella Inc",
  "Soylent Ltd",
  "Hooli",
  "Stark Industries",
  "Wayne Enterprises",
];
const STATIC_STATUSES = ["pending", "shipped", "delivered", "cancelled"] as const;
const STATIC_ORDERS: Order[] = Array.from({ length: 120 }, (_, i) => {
  const day = String((i % 27) + 1).padStart(2, "0");
  const month = String((i % 12) + 1).padStart(2, "0");
  return {
    id: `ORD-${String(1000 + i)}`,
    customer_name: STATIC_CUSTOMERS[i % STATIC_CUSTOMERS.length],
    status: STATIC_STATUSES[i % STATIC_STATUSES.length],
    amount: Math.round((25 + ((i * 37) % 975)) * 100) / 100,
    is_paid: i % 3 !== 0,
    created_at: `2026-${month}-${day}`,
  };
});

/** Fetches the current page of orders from the given engine's query route, refetching on every GridState change. */
function useOrdersDataSource(engine: Engine): DataSource<Order> {
  const [state, setState] = useState<GridState>(DEFAULT_GRID_STATE);
  const [rows, setRows] = useState<Order[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (STATIC_DEMO) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/${engine}/orders/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          // e.g. a 422 (an unsupported filter/sort against this engine — see
          // main.py) or a 501 (Meilisearch unreachable). The body is
          // {"detail": "..."} from FastAPI, not {"rows", "rowCount"} — must
          // not fall through to the success path below, which would hand
          // <DataGrid> `rows: undefined` and crash its `.filter()`/`.every()`
          // calls in "client" mode's row-selection logic.
          const detail: unknown = await response.json().catch(() => null);
          throw new Error(
            `${response.status} ${response.statusText}: ${JSON.stringify(detail)}`,
          );
        }
        return response.json() as Promise<{ rows: Order[]; rowCount: number }>;
      })
      .then((json) => {
        setRows(json.rows);
        setRowCount(json.rowCount);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(`Failed to load orders from /api/${engine}/orders/query`, error);
        setRows([]);
        setRowCount(0);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [engine, state]);

  if (STATIC_DEMO) return { mode: "client", data: STATIC_ORDERS };
  return { mode: "server", data: rows, rowCount, loading, onStateChange: setState };
}

function readEngineFromUrl(): Engine {
  return new URLSearchParams(window.location.search).get("engine") === "meili" ? "meili" : "sql";
}

// --- <TreeDataGrid> demo: a fully client-side, self-contained lazy org
// chart. Deliberately not backed by e2e/server (unlike the orders grid
// above) since this only needs to prove out lazy-loading/error/retry UX,
// not exercise a real SQL/Meili backend.
interface OrgRow {
  id: string;
  name: string;
  role: "Department" | "Team" | "Employee";
}

const orgTreeColumns: ColumnDef<OrgRow>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name", width: 260 },
  { id: "role", type: "string", header: "Role", accessorKey: "role" },
];

const ORG_ROOTS: OrgRow[] = [
  { id: "eng", name: "Engineering", role: "Department" },
  { id: "sales", name: "Sales", role: "Department" },
];

const ORG_CHILDREN: Record<string, OrgRow[]> = {
  eng: [
    { id: "eng-fe", name: "Frontend Team", role: "Team" },
    { id: "eng-be", name: "Backend Team", role: "Team" },
  ],
  "eng-fe": [
    { id: "alice", name: "Alice", role: "Employee" },
    { id: "bob", name: "Bob", role: "Employee" },
  ],
  "eng-be": [{ id: "carol", name: "Carol", role: "Employee" }],
  sales: [{ id: "sales-emea", name: "EMEA Team", role: "Team" }],
  "sales-emea": [{ id: "dave", name: "Dave", role: "Employee" }],
};

/** Simulates a real API: ~700ms latency, and "Sales" fails its first load to demo the inline error+retry UX. */
function useFakeLoadChildren(): (row: OrgRow) => Promise<OrgRow[]> {
  const salesAttempts = useRef(0);
  return (row: OrgRow) =>
    new Promise<OrgRow[]>((resolve, reject) => {
      setTimeout(() => {
        if (row.id === "sales") {
          salesAttempts.current += 1;
          if (salesAttempts.current === 1) {
            reject(new Error("Network error (simulated) — click Retry"));
            return;
          }
        }
        resolve(ORG_CHILDREN[row.id] ?? []);
      }, 700);
    });
}

function OrgTreeDemo(): ReactElement {
  const loadChildren = useFakeLoadChildren();
  return (
    <TreeDataGrid
      columns={orgTreeColumns}
      data={ORG_ROOTS}
      getRowId={(row) => row.id}
      getChildren={() => undefined}
      hasChildren={(row) => row.role !== "Employee"}
      onLoadChildren={loadChildren}
      getRowProps={(row) => (row.role === "Department" ? { className: "font-semibold" } : {})}
      rowActions={[
        {
          id: "view",
          label: "View profile",
          visible: (ctx) => ctx.row?.role === "Employee",
          onSelect: (ctx) => window.alert(`Viewing ${ctx.row?.name}`),
        },
      ]}
    />
  );
}

// --- <TreeDataGrid> inline editing demo: a small eager 2-level project/task
// tree — mirrors the flat <DataGrid> editing demo's column shape (name/
// owner/hours/done) so the two demos read as the same feature at two
// different grid types, minus a "due" column to keep it compact next to the
// tree's own indentation. Deterministic data (no Math.random/Date.now), same
// convention as the rest of this file.
interface TaskNode {
  id: string;
  name: string;
  owner: string;
  hours: number;
  done: boolean;
  children?: TaskNode[];
}

const TASK_TREE: TaskNode[] = [
  {
    id: "website",
    name: "Website Redesign",
    owner: "alice",
    hours: 0,
    done: false,
    children: [
      { id: "website-design", name: "Design mockups", owner: "alice", hours: 8, done: true },
      { id: "website-fe", name: "Implement frontend", owner: "bob", hours: 16, done: false },
    ],
  },
  {
    id: "mobile",
    name: "Mobile App",
    owner: "carol",
    hours: 0,
    done: false,
    children: [{ id: "mobile-ci", name: "Set up CI", owner: "bob", hours: 4, done: false }],
  },
];

function applyTaskEdits(nodes: TaskNode[], edits: EditedRow<TaskNode>[]): TaskNode[] {
  return nodes.map((node) => {
    const edit = edits.find((e) => e.rowId === node.id);
    const updated = edit ? { ...node, ...edit.values } : node;
    return updated.children ? { ...updated, children: applyTaskEdits(updated.children, edits) } : updated;
  });
}

function TreeEditingDemo(): ReactElement {
  const [tasks, setTasks] = useState(TASK_TREE);
  const [saving, setSaving] = useState(false);

  const taskTreeColumns: ColumnDef<TaskNode>[] = [
    { id: "name", type: "string", header: "Task", accessorKey: "name", width: 240, editable: true },
    { id: "owner", type: "enum", header: "Owner", accessorKey: "owner", editable: true, options: TASK_OWNERS },
    { id: "hours", type: "number", header: "Est. hours", accessorKey: "hours", editable: true },
    { id: "done", type: "boolean", header: "Done", accessorKey: "done", editable: true },
  ];

  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        Same inline-editing workflow as the flat grid above, on a tree — expand a project to
        edit its tasks; click any editable cell in a row (root or child) to activate that row.
      </p>
      <TreeDataGrid
        columns={taskTreeColumns}
        data={tasks}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        initialExpandedLevel={1}
        editing={{
          saving,
          onSave: (edits) =>
            new Promise<void>((resolve) => {
              setSaving(true);
              setTimeout(() => {
                setTasks((prev) => applyTaskEdits(prev, edits));
                setSaving(false);
                resolve();
              }, 600);
            }),
        }}
      />
    </div>
  );
}

// --- <TreeDataGrid> groupBy + columnVisibility demo: an eager (no lazy
// loading — that's already exercised by <OrgTreeDemo> above) department
// tree, its roots grouped by `division`, driving the same `<ColumnSelector>`
// used for the flat `<DataGrid>` above — proving `<ColumnSelector>` is
// grid-agnostic (see AGENTS.md's `<ColumnSelector>` section) and that
// `<TreeDataGrid>` reads `columnVisibility` the same read-only way
// `<DataGrid>` does.
interface DeptRow {
  id: string;
  name: string;
  headcount: number;
  division?: string;
  children?: DeptRow[];
}

const DEPT_TREE: DeptRow[] = [
  {
    id: "eng",
    name: "Engineering",
    headcount: 30,
    division: "Product",
    children: [
      { id: "eng-fe", name: "Frontend", headcount: 12 },
      { id: "eng-be", name: "Backend", headcount: 18 },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    headcount: 8,
    division: "Revenue",
    children: [{ id: "sales-emea", name: "EMEA", headcount: 8 }],
  },
  { id: "marketing", name: "Marketing", headcount: 6, division: "Revenue" },
];

const deptColumns: ColumnDef<DeptRow>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name", width: 220 },
  { id: "headcount", type: "number", header: "Headcount", accessorKey: "headcount" },
];

function TreeGroupingDemo(): ReactElement {
  const [visibility, setVisibility] = useState<ColumnVisibility>({});
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        Departments grouped by division; toggle Headcount via the column selector below — the
        same <code>&lt;ColumnSelector&gt;</code> component the flat grid above uses, driving{" "}
        <code>&lt;TreeDataGrid&gt;</code>'s own <code>columnVisibility</code> prop.
      </p>
      {/* Explicit `trigger` here (rather than the default icon button, whose
          accessible name is "Choose columns") so this doesn't collide with
          e2e/column-selector.spec.ts's `getByRole("button", { name:
          "Columns" })` locator against the flat orders grid's own trigger
          above — Playwright's default (non-exact) name match is a substring
          match, and "Choose columns" contains "Columns". */}
      <ColumnSelector
        columns={deptColumns}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        trigger={
          <button type="button" className="rounded-md border px-3 py-1 text-sm">
            Toggle fields
          </button>
        }
      />
      <div className="mt-2 h-[280px]">
        <TreeDataGrid
          columns={deptColumns}
          columnVisibility={visibility}
          data={DEPT_TREE}
          getRowId={(row) => row.id}
          getChildren={(row) => row.children}
          groupBy={(row) => row.division ?? "Other"}
          initialExpandedLevel={1}
        />
      </div>
    </div>
  );
}

// --- <NumberHistogramFilter> + facetedNumberValues demo: proves the fix for
// the exact bug reported against a consuming app's customer list page (the
// histogram's own domain was derived from data already narrowed by that same filter, so
// it shrank on every change and could never be widened back out again), AND
// demonstrates embedding it directly inside <DataGrid> via the column-level
// `filterDisplay: "row"` + `renderFilter` extension points — Price and
// Rating below render their histogram/slider inline, in a filter row under
// the header, rather than the default header-icon popover (which is too
// narrow for a slider to be usable). `renderFilter`'s third argument is the
// grid's own current `GridState.filter`, which is what lets
// `facetedNumberValues` correctly exclude only each column's own filter
// while still respecting the other's.
interface Product {
  id: string;
  name: string;
  price: number;
  rating: number;
  stock: number;
}

const PRODUCTS: Product[] = [
  { id: "p1", name: "Widget", price: 12, rating: 3, stock: 140 },
  { id: "p2", name: "Gadget", price: 45, rating: 4, stock: 32 },
  { id: "p3", name: "Gizmo", price: 89, rating: 2, stock: 0 },
  { id: "p4", name: "Doohickey", price: 199, rating: 5, stock: 8 },
  { id: "p5", name: "Contraption", price: 340, rating: 4, stock: 5 },
  { id: "p6", name: "Thingamajig", price: 15, rating: 1, stock: 260 },
  { id: "p7", name: "Whatsit", price: 620, rating: 5, stock: 2 },
  { id: "p8", name: "Gubbins", price: 72, rating: 3, stock: 47 },
];

const priceColumn: NumberColumn<Product> = { id: "price", type: "number", header: "Price", accessorKey: "price" };
const ratingColumn: NumberColumn<Product> = { id: "rating", type: "number", header: "Rating", accessorKey: "rating" };
const stockColumn: NumberColumn<Product> = { id: "stock", type: "number", header: "Stock", accessorKey: "stock" };

const productColumns: ColumnDef<Product>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
  {
    ...priceColumn,
    filterable: true,
    filterDisplay: "row",
    renderFilter: (value, onChange, filter) => (
      <NumberHistogramFilter
        column={priceColumn}
        value={value}
        onChange={onChange}
        allValues={facetedNumberValues(PRODUCTS, priceColumn, filter)}
        format={(v) => `$${v.toLocaleString()}`}
        bare={false}
      />
    ),
  },
  {
    ...ratingColumn,
    filterable: true,
    filterDisplay: "row",
    renderFilter: (value, onChange, filter) => (
      <NumberHistogramFilter
        column={ratingColumn}
        value={value}
        onChange={onChange}
        allValues={facetedNumberValues(PRODUCTS, ratingColumn, filter)}
        bare={false}
      />
    ),
  },
  {
    ...stockColumn,
    filterable: true,
    filterDisplay: "row",
    // `<NumberComparisonFilter>` instead of the histogram: for a column
    // where "greater than X" reads more naturally than "between X and Y"
    // (e.g. "stock below 10" to find what needs reordering), an Excel-style
    // operator dropdown fits better than a range slider.
    renderFilter: (value, onChange) => (
      <NumberComparisonFilter column={stockColumn} value={value} onChange={onChange} bare={false} />
    ),
  },
];

function FacetedNumberFilterDemo(): ReactElement {
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        Try filtering Price, then Rating — each histogram's own bar chart and slider bounds
        always stay full-width; only the OTHER column's active filter narrows it. Stock uses
        the Excel-style comparison filter instead, e.g. "Less than 10" to find what's low.
      </p>
      <DataGrid columns={productColumns} dataSource={{ mode: "client", data: PRODUCTS }} getRowId={(row) => row.id} />
    </div>
  );
}

// --- column pinning demo: enough columns to force horizontal scroll (via
// the max-w-md wrapper below), with the leftmost column pinned so it stays
// visible while scrolling the rest.
interface WideRow {
  id: string;
  sku: string;
  category: string;
  warehouse: string;
  supplier: string;
  region: string;
  status: string;
  lastRestocked: string;
}

const WIDE_ROWS: WideRow[] = [
  {
    id: "1",
    sku: "SKU-1001",
    category: "Fasteners",
    warehouse: "North DC",
    supplier: "Acme Corp",
    region: "EMEA",
    status: "In stock",
    lastRestocked: "2026-07-01",
  },
  {
    id: "2",
    sku: "SKU-1002",
    category: "Adhesives",
    warehouse: "South DC",
    supplier: "Globex",
    region: "APAC",
    status: "Low stock",
    lastRestocked: "2026-06-18",
  },
];

const wideColumns: ColumnDef<WideRow>[] = [
  { id: "sku", type: "string", header: "SKU", accessorKey: "sku", width: 120, pinned: "left" },
  { id: "category", type: "string", header: "Category", accessorKey: "category", width: 160 },
  { id: "warehouse", type: "string", header: "Warehouse", accessorKey: "warehouse", width: 160 },
  { id: "supplier", type: "string", header: "Supplier", accessorKey: "supplier", width: 160 },
  { id: "region", type: "string", header: "Region", accessorKey: "region", width: 160 },
  { id: "status", type: "string", header: "Status", accessorKey: "status", width: 160, pinned: "right" },
  { id: "lastRestocked", type: "string", header: "Last restocked", accessorKey: "lastRestocked", width: 160 },
];

function PinnedColumnsDemo(): ReactElement {
  return (
    <div className="max-w-md">
      <p className="mb-2 text-sm text-muted-foreground">
        Scroll this table sideways — SKU (pinned left) and Status (pinned right) stay put. Drag any
        column's right edge to resize it.
      </p>
      <DataGrid
        columns={wideColumns}
        dataSource={{ mode: "client", data: WIDE_ROWS }}
        getRowId={(row) => row.id}
        enableColumnResizing
      />
    </div>
  );
}

// --- headerGroup demo: two campaign sub-columns spanned under one label
// each, plus one ungrouped column (SKU) that spans both header rows instead
// of leaving a blank cell above it — the shape a per-campaign pricing grid
// (several sub-columns per campaign) needs.
interface CampaignRow {
  sku: string;
  summer_price: string;
  summer_stock: string;
  winter_price: string;
  winter_stock: string;
}

const campaignRows: CampaignRow[] = [
  { sku: "SKU-100", summer_price: "19.90", summer_stock: "120", winter_price: "24.90", winter_stock: "40" },
  { sku: "SKU-200", summer_price: "9.50", summer_stock: "0", winter_price: "12.00", winter_stock: "75" },
];

const campaignColumns: ColumnDef<CampaignRow>[] = [
  { id: "sku", type: "string", header: "SKU", accessorKey: "sku", width: 100 },
  {
    id: "summer_price",
    type: "string",
    header: "Price",
    accessorKey: "summer_price",
    headerGroup: "Summer Sale",
  },
  {
    id: "summer_stock",
    type: "string",
    header: "Stock",
    accessorKey: "summer_stock",
    headerGroup: "Summer Sale",
  },
  {
    id: "winter_price",
    type: "string",
    header: "Price",
    accessorKey: "winter_price",
    headerGroup: "Winter Sale",
  },
  {
    id: "winter_stock",
    type: "string",
    header: "Stock",
    accessorKey: "winter_stock",
    headerGroup: "Winter Sale",
  },
];

function HeaderGroupDemo(): ReactElement {
  return (
    <div className="max-w-2xl">
      <p className="mb-2 text-sm text-muted-foreground">
        "Price"/"Stock" are spanned under a "Summer Sale"/"Winter Sale" label each; SKU (no
        `headerGroup`) spans both header rows instead of sitting under a blank cell.
      </p>
      <DataGrid
        columns={campaignColumns}
        dataSource={{ mode: "client", data: campaignRows }}
        getRowId={(row) => row.sku}
      />
    </div>
  );
}

// --- virtualized scrolling demo: the full row set is already in memory
// (no incremental "load more on scroll" — see AGENTS.md's `virtualize` for
// that pattern if you need it instead), just rendered through the
// virtualizer so scrolling 5,000 rows stays smooth. "server" mode, not
// "client" — client mode still paginates via GridState.pageSize, which would
// cap what's rendered to one page regardless of how many rows `data` holds;
// `showPagination={false}` hides the Previous/Next footer that would
// otherwise imply paging even though `onStateChange` is a no-op here (there's
// nothing to page — the whole dataset is already loaded).
interface BigRow {
  id: string;
  label: string;
}

const bigRowColumns: ColumnDef<BigRow>[] = [
  { id: "id", type: "string", header: "ID", accessorKey: "id", width: 80 },
  { id: "label", type: "string", header: "Label", accessorKey: "label" },
];

const TOTAL_ROWS = 5000;
const ALL_BIG_ROWS: BigRow[] = Array.from({ length: TOTAL_ROWS }, (_, i) => ({ id: String(i), label: `Item ${i}` }));

function VirtualizedScrollDemo(): ReactElement {
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        {TOTAL_ROWS.toLocaleString()} rows, virtualized — only the rows near the visible viewport are
        ever mounted, so scrolling stays smooth however far down the list you go.
      </p>
      <DataGrid
        columns={bigRowColumns}
        dataSource={{ mode: "server", data: ALL_BIG_ROWS, rowCount: TOTAL_ROWS, onStateChange: () => {} }}
        getRowId={(row) => row.id}
        showPagination={false}
        virtualize={{ maxBodyHeight: 480 }}
      />
    </div>
  );
}

// --- groupBy demo: enough departments/members to scroll a few groups past
// each other inside the grid's own (height-bounded) scroll container, to
// exercise the group-header row's sticky-below-thead behavior and its
// zebra-gated shading — rather than just the single always-expanded,
// never-scrolled group a smaller dataset would show.
interface TeamMember {
  id: string;
  name: string;
  department: string;
  role: string;
}

const DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Support", "Finance"];
const ROLES = ["Manager", "Senior", "Associate", "Junior"];
const FIRST_NAMES = [
  "Alice",
  "Bob",
  "Carol",
  "Dave",
  "Eve",
  "Frank",
  "Grace",
  "Heidi",
];
const TEAM_MEMBERS: TeamMember[] = DEPARTMENTS.flatMap((department, dIndex) =>
  FIRST_NAMES.map((name, nIndex) => ({
    id: `${department}-${name}`,
    name: `${name} ${department[0]}.`,
    department,
    role: ROLES[(dIndex + nIndex) % ROLES.length]!,
  })),
);

const teamMemberColumns: ColumnDef<TeamMember>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
  { id: "role", type: "string", header: "Role", accessorKey: "role" },
];

function GroupingDemo(): ReactElement {
  const [zebra, setZebra] = useState(true);
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        Grouped by department — scroll within the grid to see each department's header stick
        below the column header as its members pass underneath.
      </p>
      <button
        type="button"
        data-testid="grouping-zebra-toggle"
        aria-pressed={zebra}
        className="mb-2 rounded-md border px-3 py-1 text-sm"
        onClick={() => setZebra((prev) => !prev)}
      >
        Zebra: {zebra ? "On" : "Off"}
      </button>
      <div className="h-[380px]">
        <DataGrid
          testId="grouping-grid"
          columns={teamMemberColumns}
          dataSource={{ mode: "client", data: TEAM_MEMBERS }}
          getRowId={(row) => row.id}
          groupBy={(row) => row.department}
          showPagination={false}
          initialState={{ pageSize: TEAM_MEMBERS.length }}
          zebra={zebra}
        />
      </div>
    </div>
  );
}

// --- groupBy + virtualize demo: enough rows per department to push the
// total row count past `virtualize`'s default threshold (100), so this
// actually exercises the two composed together -- not just grouping alone
// (`GroupingDemo` above, well under the threshold) or plain virtualizing
// alone (`VirtualizedScrollDemo` above, no `groupBy`). Deterministic
// generated names (no Math.random/Date.now), same reason `STATIC_ORDERS`
// below is: screenshots need reproducible content.
interface LargeTeamMember {
  id: string;
  name: string;
  department: string;
}

const MEMBERS_PER_DEPARTMENT = 30;
const LARGE_TEAM: LargeTeamMember[] = DEPARTMENTS.flatMap((department) =>
  Array.from({ length: MEMBERS_PER_DEPARTMENT }, (_, i) => ({
    id: `${department}-${i}`,
    name: `${department} member ${i + 1}`,
    department,
  })),
);

const largeTeamColumns: ColumnDef<LargeTeamMember>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
];

function GroupedVirtualizedDemo(): ReactElement {
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        {LARGE_TEAM.length.toLocaleString()} rows across {DEPARTMENTS.length} departments, grouped
        AND virtualized together — only the rows (and group headers) near the visible viewport are
        ever mounted.
      </p>
      <DataGrid
        testId="grouped-virtualized-grid"
        columns={largeTeamColumns}
        dataSource={{ mode: "client", data: LARGE_TEAM }}
        getRowId={(row) => row.id}
        groupBy={(row) => row.department}
        showPagination={false}
        initialState={{ pageSize: LARGE_TEAM.length }}
        virtualize={{ maxBodyHeight: 480 }}
      />
    </div>
  );
}

// --- inline editing demo: a small, deterministic task list (no
// Math.random/Date.now — see STATIC_ORDERS's own comment on why screenshots
// need reproducible data) with one column of each editable `type`, a
// required-field `validateEdit`, and a fake ~600ms `onSave` (setTimeout, not
// a real endpoint — this demo has no backend call to make) so the Save
// button's disabled/pending state is visible in a screenshot, not just
// theoretical.
interface Task {
  id: string;
  title: string;
  owner: string;
  hours: number;
  done: boolean;
  due: string;
}

const TASK_OWNERS: { value: string; label: string }[] = [
  { value: "alice", label: "Alice" },
  { value: "bob", label: "Bob" },
  { value: "carol", label: "Carol" },
];

const INITIAL_TASKS: Task[] = [
  { id: "1", title: "Draft Q3 roadmap", owner: "alice", hours: 6, done: false, due: "2026-09-05" },
  { id: "2", title: "Fix flaky checkout test", owner: "bob", hours: 2, done: true, due: "2026-08-28" },
  { id: "3", title: "Review vendor contract", owner: "carol", hours: 3, done: false, due: "2026-09-12" },
];

function InlineEditingDemo(): ReactElement {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [saving, setSaving] = useState(false);

  const taskColumns: ColumnDef<Task>[] = [
    {
      id: "title",
      type: "string",
      header: "Task",
      accessorKey: "title",
      editable: true,
      validateEdit: (value) => (typeof value === "string" && value.trim() === "" ? "Title is required" : undefined),
    },
    {
      id: "owner",
      type: "enum",
      header: "Owner",
      accessorKey: "owner",
      editable: true,
      options: TASK_OWNERS,
    },
    { id: "hours", type: "number", header: "Est. hours", accessorKey: "hours", editable: true },
    { id: "done", type: "boolean", header: "Done", accessorKey: "done", editable: true },
    { id: "due", type: "date", header: "Due", accessorKey: "due", editable: true },
  ];

  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        Every column here is <code>editable</code> — click any cell in a row to turn that whole row into
        editors (focus lands on the cell you clicked); clicking into another row switches to it, one row
        in edit mode at a time. Edits accumulate locally across rows (nothing is sent anywhere yet); the
        bar above the grid appears once something has changed, with a Save button whose label counts the
        changed rows. Clearing the Task column shows the built-in <code>validateEdit</code> error state,
        which blocks Save until it's fixed.
      </p>
      <DataGrid
        testId="editing-grid"
        columns={taskColumns}
        dataSource={{ mode: "client", data: tasks }}
        getRowId={(row) => row.id}
        showPagination={false}
        editing={{
          saving,
          onSave: (edits) =>
            new Promise<void>((resolve) => {
              setSaving(true);
              setTimeout(() => {
                setTasks((prev) =>
                  prev.map((task) => {
                    const edit = edits.find((e) => e.rowId === task.id);
                    return edit ? { ...task, ...edit.values } : task;
                  }),
                );
                setSaving(false);
                resolve();
              }, 600);
            }),
          saveLabel: (count) => `Save ${count} change${count === 1 ? "" : "s"}`,
        }}
      />
    </div>
  );
}

// --- cellEditing demo: the same small deterministic task shape as the
// row-batch editing demo above, but wired through `cellEditing` instead of
// `editing` — every change applies immediately, no Save/Discard bar. Proves
// out range-select (drag, or shift+click/shift+arrow), click-to-edit (a
// plain click opens a cell's editor directly — F2/double-click still work
// too), clipboard copy/paste, the fill-handle, a non-editable column mixed
// in among editable ones, and the `alwaysEdit` toggle, against the
// library's own default editors.
interface CellEditingTask {
  id: string;
  title: string;
  owner: string;
  hours: number;
  done: boolean;
}

const CELL_EDITING_TASKS: CellEditingTask[] = [
  { id: "1", title: "Draft Q3 roadmap", owner: "alice", hours: 6, done: false },
  { id: "2", title: "Fix flaky checkout test", owner: "bob", hours: 2, done: true },
  { id: "3", title: "Review vendor contract", owner: "carol", hours: 3, done: false },
  { id: "4", title: "Update onboarding docs", owner: "alice", hours: 4, done: false },
  { id: "5", title: "Triage support backlog", owner: "bob", hours: 5, done: false },
];

function CellEditingDemo(): ReactElement {
  const [tasks, setTasks] = useState(CELL_EDITING_TASKS);
  const [alwaysEdit, setAlwaysEdit] = useState(false);

  const cellEditingColumns: ColumnDef<CellEditingTask>[] = [
    // Not `editable` — selectable/copyable like any other cell, but never
    // opens an editor (click, double-click, or `alwaysEdit` alike), proving
    // the two coexist in one grid rather than `cellEditing` requiring every
    // column to be editable.
    { id: "id", type: "string", header: "ID", accessorKey: "id" },
    {
      id: "title",
      type: "string",
      header: "Task",
      accessorKey: "title",
      editable: true,
      validateEdit: (value) => (typeof value === "string" && value.trim() === "" ? "Title is required" : undefined),
    },
    { id: "owner", type: "enum", header: "Owner", accessorKey: "owner", editable: true, options: TASK_OWNERS },
    { id: "hours", type: "number", header: "Est. hours", accessorKey: "hours", editable: true },
    { id: "done", type: "boolean", header: "Done", accessorKey: "done", editable: true },
  ];

  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        True spreadsheet editing — click a cell to open its editor directly (F2 or double-click
        also work, on the selected cell), drag (or shift+click/shift+arrow) to select a range
        without editing, Ctrl/Cmd+C and +V to copy/paste a range (a single copied value fills the
        whole selection), and drag the small square at the selection's corner to fill adjacent
        cells. The ID column isn't `editable` — it's still selectable and copyable, just never
        opens an editor. Every change applies immediately — no Save button.
      </p>
      <label className="mb-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={alwaysEdit} onChange={(e) => setAlwaysEdit(e.target.checked)} />
        <code>cellEditing.alwaysEdit</code> — every editable cell shows its editor all the time,
        no click needed
      </label>
      <DataGrid
        testId="cell-editing-grid"
        columns={cellEditingColumns}
        dataSource={{ mode: "client", data: tasks }}
        getRowId={(row) => row.id}
        showPagination={false}
        cellEditing={{
          alwaysEdit,
          onCellsChange: (changes) => {
            // A paste or fill-drag spanning multiple columns for the same
            // row produces multiple entries sharing one rowId — merge ALL
            // of them per row (not just the first, `.find()`'s own result)
            // or a multi-column gesture would silently drop every column
            // but one.
            setTasks((prev) =>
              prev.map((task) => {
                const rowChanges = changes.filter((c) => c.rowId === task.id);
                if (rowChanges.length === 0) return task;
                const patch = Object.fromEntries(rowChanges.map((c) => [c.columnId, c.value]));
                return { ...task, ...patch };
              }),
            );
          },
        }}
      />
    </div>
  );
}

/**
 * The whole demo: an engine toggle (SQL / Meilisearch, also settable via
 * ?engine=), a dark-mode toggle, and a <ColumnSelector> trigger, all driving
 * one <DataGrid>.
 */
export function App(): ReactElement {
  const [engine, setEngine] = useState<Engine>(readEngineFromUrl);
  const [visibility, setVisibility] = useState<ColumnVisibility>({});
  // Mirrors a reference consumer app's own dark-mode convention: toggling the `dark` class on
  // <html> flips every `dark:`-prefixed utility (see globals.css's
  // `@custom-variant dark`). Read the initial value from the DOM rather than
  // defaulting to `false`, in case something upstream (a saved preference, a
  // parent app embedding this grid) already set the class before mount.
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  function selectEngine(next: Engine): void {
    const params = new URLSearchParams(window.location.search);
    params.set("engine", next);
    window.history.pushState({}, "", `?${params.toString()}`);
    setEngine(next);
  }

  function toggleDarkMode(): void {
    const next = !darkMode;
    document.documentElement.classList.toggle("dark", next);
    setDarkMode(next);
  }

  const dataSource = useOrdersDataSource(engine);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">@bmsuisse/datagrid demo — orders</h1>
        <button
          type="button"
          data-testid="dark-mode-toggle"
          aria-pressed={darkMode}
          className="rounded-md border px-3 py-1 text-sm"
          onClick={toggleDarkMode}
        >
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      </div>
      <div className="mb-4 flex items-center justify-between gap-2">
        {STATIC_DEMO ? (
          <p className="text-sm text-muted-foreground">
            Client-side sample data — the real package also supports server-side SQL and
            Meilisearch backends, see the docs.
          </p>
        ) : (
          <nav className="flex gap-2" role="tablist" aria-label="Query engine">
            <button
              type="button"
              role="tab"
              aria-selected={engine === "sql"}
              data-testid="engine-sql"
              className="rounded-md border px-3 py-1 text-sm data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              data-state={engine === "sql" ? "active" : "inactive"}
              onClick={() => selectEngine("sql")}
            >
              SQL (SQLite)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={engine === "meili"}
              data-testid="engine-meili"
              className="rounded-md border px-3 py-1 text-sm data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              data-state={engine === "meili" ? "active" : "inactive"}
              onClick={() => selectEngine("meili")}
            >
              Meilisearch
            </button>
          </nav>
        )}
        <ColumnSelector
          columns={columns}
          visibility={visibility}
          onVisibilityChange={setVisibility}
          persistKey="orders"
          trigger={
            <button type="button" className="rounded-md border px-3 py-1 text-sm">
              Columns
            </button>
          }
        />
      </div>
      {/* key={engine} forces a clean remount (fresh GridState) when switching engines. */}
      <DataGrid
        key={engine}
        testId="orders-grid"
        columns={columns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        columnVisibility={visibility}
        onColumnVisibilityChange={setVisibility}
        enableMultiSort
        renderDetail={(row) => (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <dt className="text-muted-foreground">Order ID</dt>
            <dd>{row.id}</dd>
            <dt className="text-muted-foreground">Customer</dt>
            <dd>{row.customer_name}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{row.status}</dd>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{row.created_at}</dd>
          </dl>
        )}
      />

      <h2 className="mb-2 mt-8 text-lg font-semibold">
        &lt;NumberHistogramFilter&gt; demo — faceted numeric filters
      </h2>
      <FacetedNumberFilterDemo />

      <h2 className="mb-2 mt-8 text-lg font-semibold">Column pinning + resize demo</h2>
      <PinnedColumnsDemo />

      <h2 className="mb-2 mt-8 text-lg font-semibold">headerGroup demo — spanning header cells</h2>
      <HeaderGroupDemo />

      <h2 className="mb-2 mt-8 text-lg font-semibold">groupBy demo — sticky group headers</h2>
      <GroupingDemo />

      <h2 className="mb-2 mt-8 text-lg font-semibold">editable demo — inline editing + Save/Discard</h2>
      <InlineEditingDemo />

      <h2 className="mb-2 mt-8 text-lg font-semibold">cellEditing demo — true spreadsheet editing</h2>
      <CellEditingDemo />

      <h2 className="mb-2 mt-8 text-lg font-semibold">Virtualized scrolling demo</h2>
      <VirtualizedScrollDemo />

      <h2 className="mb-2 mt-8 text-lg font-semibold">groupBy + virtualize demo — grouped AND windowed together</h2>
      <GroupedVirtualizedDemo />

      <h2 className="mb-2 mt-8 text-lg font-semibold">
        &lt;TreeDataGrid&gt; demo — lazy-loading org chart
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Expand "Sales" to see the inline error+retry UX (its first load always fails).
      </p>
      <OrgTreeDemo />

      <h2 className="mb-2 mt-8 text-lg font-semibold">
        &lt;TreeDataGrid&gt; editable demo — inline editing on a tree
      </h2>
      <TreeEditingDemo />

      <h2 className="mb-2 mt-8 text-lg font-semibold">
        &lt;TreeDataGrid&gt; groupBy + columnVisibility demo
      </h2>
      <TreeGroupingDemo />
    </div>
  );
}
