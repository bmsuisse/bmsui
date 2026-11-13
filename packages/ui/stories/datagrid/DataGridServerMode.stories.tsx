import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataGrid, type GridState, evaluateFilter } from "@bmsuisse/datagrid";
import { Button } from "@bmsuisse/ui";
import { type Order, getOrderId, makeOrders, orderColumns } from "./sampleData";

const meta: Meta = { title: "DataGrid/DataGridServerMode", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

const all = makeOrders(240);
const initial: GridState = { filter: null, sort: [], page: 0, pageSize: 10 };

/** Stand-in for a backend: applies filter + sort + paging after a delay. */
function fakeFetch(state: GridState, delayMs = 600, fail = false): Promise<{ rows: Order[]; rowCount: number }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) return reject(new Error("Network error: the fake server refused to answer."));
      let rows = state.filter ? all.filter((r) => evaluateFilter(r as unknown as Record<string, unknown>, state.filter!)) : [...all];
      for (const s of [...state.sort].reverse()) {
        const key = s.field as keyof Order;
        rows.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (s.dir === "desc" ? -1 : 1));
      }
      const rowCount = rows.length;
      rows = rows.slice(state.page * state.pageSize, (state.page + 1) * state.pageSize);
      resolve({ rows, rowCount });
    }, delayMs);
  });
}

function useServerGrid(failOnce = false) {
  const [state, setState] = useState<GridState>(initial);
  const [rows, setRows] = useState<Order[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const failNext = useRef(failOnce);
  const requestId = useRef(0);

  const load = useCallback((s: GridState) => {
    const id = ++requestId.current;
    setLoading(true);
    const fail = failNext.current;
    failNext.current = false;
    fakeFetch(s, 600, fail)
      .then((res) => {
        if (id !== requestId.current) return;
        setRows(res.rows);
        setRowCount(res.rowCount);
        setError(null);
      })
      .catch((e: Error) => id === requestId.current && setError(e))
      .finally(() => id === requestId.current && setLoading(false));
  }, []);

  useEffect(() => load(initial), [load]);
  const onStateChange = useCallback(
    (s: GridState) => {
      setState(s);
      load(s);
    },
    [load],
  );
  return { state, setState, rows, rowCount, loading, error, onStateChange, load };
}

/** `onStateChange` fires on every sort/filter/page change; the grid renders whatever `data`/`rowCount` come back. */
export const Server: Story = {
  render: function Render() {
    const g = useServerGrid();
    return (
      <DataGrid
        columns={orderColumns}
        dataSource={{ mode: "server", data: g.rows, rowCount: g.rowCount, loading: g.loading, onStateChange: g.onStateChange }}
        getRowId={getOrderId}
        loading={g.loading}
        initialState={initial}
      />
    );
  },
};

/** Fully two-way controlled: `gridState` mirrors `onStateChange`, and a button pushes a new state in. */
export const ControlledGridState: Story = {
  render: function Render() {
    const g = useServerGrid();
    const push = (next: GridState) => {
      g.setState(next);
      g.load(next);
    };
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => push({ ...g.state, page: 0, filter: { logic: "and", filters: [{ field: "status", operator: "eq", value: "overdue" }] } })}
          >
            Show overdue
          </Button>
          <Button variant="outline" size="sm" onClick={() => push(initial)}>
            Reset
          </Button>
          <span className="text-sm text-muted-foreground">
            page {g.state.page + 1}, {g.state.sort.length} sort, {g.state.filter ? "filtered" : "no filter"}
          </span>
        </div>
        <DataGrid
          columns={orderColumns}
          dataSource={{ mode: "server", data: g.rows, rowCount: g.rowCount, loading: g.loading, onStateChange: g.onStateChange }}
          getRowId={getOrderId}
          loading={g.loading}
          gridState={g.state}
        />
      </div>
    );
  },
};

/** First request fails; Retry refetches the current state. */
export const ServerError: Story = {
  render: function Render() {
    const g = useServerGrid(true);
    return (
      <DataGrid
        columns={orderColumns}
        dataSource={{ mode: "server", data: g.rows, rowCount: g.rowCount, loading: g.loading, onStateChange: g.onStateChange }}
        getRowId={getOrderId}
        loading={g.loading}
        error={g.error}
        onRetry={() => g.load(g.state)}
        initialState={initial}
      />
    );
  },
};
