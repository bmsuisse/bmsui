import type { ReactElement } from "react";
import { useRef, useState } from "react";
import { TreeDataGrid, type ColumnDef, type TreeDataGridApi } from "@bmsuisse/datagrid";

interface Line {
  id: string;
  name: string;
  q1: number;
  q2: number;
  margin: number;
  units: number;
  children?: Line[];
}

const ROWS = 2000;

function makeData(): Line[] {
  return Array.from({ length: ROWS }, (_, i) => {
    const base = ((i * 7919) % 900) + 100;
    const line: Line = {
      id: `p${i}`,
      name: `Product line ${i + 1}`,
      q1: base,
      q2: base + ((i * 31) % 120),
      margin: ((i * 13) % 40) + 10,
      units: ((i * 17) % 500) + 20,
    };
    if (i % 5 === 0) {
      line.children = [0, 1].map((c) => ({
        id: `p${i}-${c}`,
        name: `Variant ${c + 1}`,
        q1: Math.round(base / 2),
        q2: Math.round(line.q2 / 2),
        margin: line.margin,
        units: Math.round(line.units / 2),
      }));
    }
    return line;
  });
}

const DATA = makeData();
const chf = (v: unknown): string => new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(Number(v));
const sum = (rows: Line[], key: "q1" | "q2" | "units"): number => rows.reduce((s, r) => s + r[key], 0);

const TOTALS: Line = {
  id: "total",
  name: "Grand total",
  q1: sum(DATA, "q1"),
  q2: sum(DATA, "q2"),
  margin: 27,
  units: sum(DATA, "units"),
};

const COLUMNS: ColumnDef<Line>[] = [
  { id: "name", type: "string", header: "Product", accessorKey: "name", width: 220 },
  { id: "q1", type: "number", header: "Q1", accessorKey: "q1", headerGroup: "Revenue (CHF)", cell: chf, summary: (r) => chf(sum(r, "q1")) },
  { id: "q2", type: "number", header: "Q2", accessorKey: "q2", headerGroup: "Revenue (CHF)", cell: chf, summary: (r) => chf(sum(r, "q2")) },
  { id: "margin", type: "number", header: "Margin %", accessorKey: "margin", headerGroup: "Profitability", cell: (v) => `${String(v)} %` },
  { id: "units", type: "number", header: "Units", accessorKey: "units", headerGroup: "Profitability", cell: chf, summary: (r) => chf(sum(r, "units")) },
];

/**
 * Matrix-style TreeDataGrid: spanning header groups, a pre-computed total pinned
 * at the top (`?totals=top`, also keeps the `showTotals` summary pinned at the
 * bottom) or at the bottom (`?totals=bottom`), expandable rows, 2000 virtualized rows.
 * Open with `?matrix`.
 */
export function MatrixDemo(): ReactElement {
  const position = new URLSearchParams(window.location.search).get("totals") === "bottom" ? "bottom" : "top";
  const apiRef = useRef<TreeDataGridApi>(null);
  const [target, setTarget] = useState("1500");
  return (
    <div className="mx-auto max-w-4xl space-y-3 p-6">
      <h1 className="text-lg font-semibold">TreeDataGrid: header groups, pinned totals, scrollToIndex</h1>
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="row-index">Scroll to row</label>
        <input
          id="row-index"
          data-testid="row-index"
          className="w-24 rounded border px-2 py-1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <button
          type="button"
          data-testid="scroll-to"
          className="rounded border px-3 py-1"
          onClick={() => apiRef.current?.scrollToIndex(Number(target))}
        >
          Go
        </button>
      </div>
      <TreeDataGrid
        columns={COLUMNS}
        data={DATA}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        maxBodyHeight={420}
        estimatedRowHeight={25}
        cellPadding="compact"
        totals={TOTALS}
        totalsPosition={position}
        totalsRowProps={{ "data-testid": "grand-total", "data-kind": "grand" }}
        showTotals={position === "top"}
        getRowProps={(_row, _depth, _index, state) => (state.hasChildren ? { "aria-expanded": state.expanded } : {})}
        tableProps={{ "aria-rowcount": ROWS + 1, "data-layout": "matrix" }}
        apiRef={apiRef}
        testId="matrix-scroll"
      />
    </div>
  );
}
