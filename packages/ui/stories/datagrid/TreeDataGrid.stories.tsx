import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  type ColumnDef,
  type ColumnVisibility,
  ColumnSelector,
  type EditedRow,
  type GridState,
  TreeDataGrid,
} from "@bmsuisse/datagrid";
import { useRef, useState } from "react";

const meta: Meta = { title: "DataGrid/TreeDataGrid", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

// --- eager tree ---------------------------------------------------------------
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
  {
    id: "headcount",
    type: "number",
    header: "Headcount",
    accessorKey: "headcount",
    summary: (roots: DeptRow[]) => roots.reduce((sum, root) => sum + root.headcount, 0),
  },
];

export const Eager: Story = {
  render: () => (
    <TreeDataGrid
      columns={deptColumns}
      data={DEPT_TREE}
      getRowId={(row) => row.id}
      getChildren={(row) => row.children}
      initialExpandedLevel={1}
    />
  ),
};

// --- lazy tree ----------------------------------------------------------------
interface OrgRow {
  id: string;
  name: string;
  role: "Department" | "Team" | "Employee";
}

const ROLE_OPTIONS = [
  { value: "Department", label: "Department" },
  { value: "Team", label: "Team" },
  { value: "Employee", label: "Employee" },
];

const orgColumns: ColumnDef<OrgRow>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name", width: 260, sortable: true, filterable: true },
  { id: "role", type: "enum", header: "Role", accessorKey: "role", sortable: true, filterable: true, options: ROLE_OPTIONS },
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

/** ~700ms latency; "Sales" fails its first load to show the inline error + Retry. */
function useFakeLoadChildren(): (row: OrgRow) => Promise<OrgRow[]> {
  const salesAttempts = useRef(0);
  return (row) =>
    new Promise<OrgRow[]>((resolve, reject) => {
      setTimeout(() => {
        if (row.id === "sales") {
          salesAttempts.current += 1;
          if (salesAttempts.current === 1) {
            reject(new Error("Network error (simulated)"));
            return;
          }
        }
        resolve(ORG_CHILDREN[row.id] ?? []);
      }, 700);
    });
}

export const LazyLoading: Story = {
  render: () => {
    const loadChildren = useFakeLoadChildren();
    return (
      <TreeDataGrid
        columns={orgColumns.map(({ sortable: _s, filterable: _f, ...c }) => c as ColumnDef<OrgRow>)}
        data={ORG_ROOTS}
        getRowId={(row) => row.id}
        getChildren={() => undefined}
        hasChildren={(row) => row.role !== "Employee"}
        onLoadChildren={loadChildren}
      />
    );
  },
};

// --- sort + filter ------------------------------------------------------------
export const SortAndFilter: Story = {
  render: () => {
    const loadChildren = useFakeLoadChildren();
    const [gridState, setGridState] = useState<Pick<GridState, "filter" | "sort">>({ filter: null, sort: [] });
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Only loaded nodes are searched: expand Engineering and its teams first, then filter for "Alice".
        </p>
        <TreeDataGrid
          columns={orgColumns}
          gridState={gridState}
          onGridStateChange={setGridState}
          data={ORG_ROOTS}
          getRowId={(row) => row.id}
          getChildren={() => undefined}
          hasChildren={(row) => row.role !== "Employee"}
          onLoadChildren={loadChildren}
        />
      </div>
    );
  },
};

// --- virtualized --------------------------------------------------------------
interface BigRow {
  id: string;
  name: string;
}
const BIG_ROWS: BigRow[] = Array.from({ length: 200 }, (_, i) => ({ id: `row-${i}`, name: `Row ${i + 1}` }));
const bigColumns: ColumnDef<BigRow>[] = [{ id: "name", type: "string", header: "Name", accessorKey: "name" }];

export const Virtualized: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">200 rows; the header stays pinned while the body scrolls.</p>
      <TreeDataGrid
        columns={bigColumns}
        data={BIG_ROWS}
        getRowId={(row) => row.id}
        getChildren={() => undefined}
        maxBodyHeight={360}
      />
    </div>
  ),
};

// --- inline editing -----------------------------------------------------------
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

const TASK_OWNERS = [
  { value: "alice", label: "Alice" },
  { value: "bob", label: "Bob" },
  { value: "carol", label: "Carol" },
];

const taskColumns: ColumnDef<TaskNode>[] = [
  { id: "name", type: "string", header: "Task", accessorKey: "name", width: 240, editable: true },
  { id: "owner", type: "enum", header: "Owner", accessorKey: "owner", editable: true, options: TASK_OWNERS },
  { id: "hours", type: "number", header: "Est. hours", accessorKey: "hours", editable: true },
  { id: "done", type: "boolean", header: "Done", accessorKey: "done", editable: true },
];

function applyTaskEdits(nodes: TaskNode[], edits: EditedRow<TaskNode>[]): TaskNode[] {
  return nodes.map((node) => {
    const edit = edits.find((e) => e.rowId === node.id);
    const updated = edit ? { ...node, ...edit.values } : node;
    return updated.children ? { ...updated, children: applyTaskEdits(updated.children, edits) } : updated;
  });
}

export const InlineEditing: Story = {
  render: () => {
    const [tasks, setTasks] = useState(TASK_TREE);
    const [saving, setSaving] = useState(false);
    return (
      <TreeDataGrid
        columns={taskColumns}
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
    );
  },
};

// --- groupBy + column visibility ----------------------------------------------
export const GroupedWithColumnVisibility: Story = {
  render: () => {
    const [visibility, setVisibility] = useState<ColumnVisibility>({});
    return (
      <div className="flex flex-col gap-2">
        <div>
          <ColumnSelector columns={deptColumns} visibility={visibility} onVisibilityChange={setVisibility} />
        </div>
        <div className="h-[300px]">
          <TreeDataGrid
            columns={deptColumns}
            columnVisibility={visibility}
            data={DEPT_TREE}
            getRowId={(row) => row.id}
            getChildren={(row) => row.children}
            groupBy={(row) => row.division ?? "Other"}
            initialExpandedLevel={1}
            showTotals
          />
        </div>
      </div>
    );
  },
};

// --- controlled tri-state selection -------------------------------------------
export const Selection: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set(["eng-fe"]));
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {selectedIds.size} selected. A parent shows indeterminate when a loaded descendant is selected; no cascade
          is built in.
        </p>
        <TreeDataGrid
          columns={deptColumns}
          data={DEPT_TREE}
          getRowId={(row) => row.id}
          getChildren={(row) => row.children}
          initialExpandedLevel={1}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      </div>
    );
  },
};

// --- column resizing ----------------------------------------------------------
export const ColumnResizing: Story = {
  render: () => (
    <TreeDataGrid
      columns={[
        { id: "name", type: "string", header: "Name", accessorKey: "name", width: 260 },
        { id: "headcount", type: "number", header: "Headcount", accessorKey: "headcount", width: 140 },
      ] satisfies ColumnDef<DeptRow>[]}
      data={DEPT_TREE}
      getRowId={(row) => row.id}
      getChildren={(row) => row.children}
      initialExpandedLevel={1}
      enableColumnResizing
    />
  ),
};
