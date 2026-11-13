import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ColumnDef, DataGrid, type FilterLabels } from "@bmsuisse/datagrid";
import { type Order, getOrderId, orderColumns, orders } from "./sampleData";

const meta: Meta = { title: "DataGrid/DataGrid", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

const chf = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" });

/** Sort + filter for every column type: string, enum, number, currency, date, boolean. */
export const Client: Story = {
  render: () => (
    <DataGrid columns={orderColumns} dataSource={{ mode: "client", data: orders }} getRowId={getOrderId} enableMultiSort initialState={{ pageSize: 10 }} />
  ),
};

export const Loading: Story = {
  name: "Loading (skeleton)",
  render: () => <DataGrid columns={orderColumns} dataSource={{ mode: "client", data: [] }} getRowId={getOrderId} loading />,
};

export const Refetching: Story = {
  name: "Refetching (rows stay, bar on top)",
  render: () => <DataGrid columns={orderColumns} dataSource={{ mode: "client", data: orders.slice(0, 8) }} getRowId={getOrderId} loading />,
};

export const ErrorWithRetry: Story = {
  render: () => (
    <DataGrid
      columns={orderColumns}
      dataSource={{ mode: "client", data: [] }}
      getRowId={getOrderId}
      error={{ title: "Could not load orders", message: "The server answered with 503.", details: "GET /api/orders -> 503 Service Unavailable" }}
      onRetry={() => alert("Retry clicked")}
    />
  ),
};

export const ErrorOverStaleRows: Story = {
  render: () => (
    <DataGrid
      columns={orderColumns}
      dataSource={{ mode: "client", data: orders.slice(0, 6) }}
      getRowId={getOrderId}
      error="Refresh failed, showing old data."
      onRetry={() => alert("Retry clicked")}
    />
  ),
};

export const Empty: Story = {
  render: () => <DataGrid columns={orderColumns} dataSource={{ mode: "client", data: [] }} getRowId={getOrderId} />,
};

export const EmptyCustomLabels: Story = {
  render: () => (
    <DataGrid columns={orderColumns} dataSource={{ mode: "client", data: [] }} getRowId={getOrderId} statusLabels={{ noResults: "Keine Treffer." }} />
  ),
};

/** A column's first click sorts descending (desc -> asc -> none). */
export const SortDescFirst: Story = {
  render: () => {
    const columns: ColumnDef<Order>[] = orderColumns.map((c) => (c.id === "amount" ? { ...c, sortDescFirst: true } : c));
    return <DataGrid columns={columns} dataSource={{ mode: "client", data: orders }} getRowId={getOrderId} initialState={{ pageSize: 10 }} />;
  },
};

const germanLabels: Partial<FilterLabels> = {
  filterAriaLabel: (header) => `${header} filtern`,
  searchPlaceholder: (header) => `${header} suchen…`,
  selectAll: "Alle auswählen",
  noMatches: "Keine Treffer.",
  selectedCount: (count) => `${count} ausgewählt`,
  stringPlaceholder: (header) => `${header} filtern…`,
  stringContains: "Enthält",
  stringIs: "Ist",
  stringStartsWith: "Beginnt mit",
  stringEndsWith: "Endet mit",
  booleanAll: "Alle",
  booleanYes: "Ja",
  booleanNo: "Nein",
  minPlaceholder: "Min.",
  maxPlaceholder: "Max.",
  rangeSeparator: "bis",
  clear: "Zurücksetzen",
  dateToday: "Heute",
  dateLast7Days: "Letzte 7 Tage",
  dateThisMonth: "Dieser Monat",
  dateCustom: "Benutzerdefiniert",
};

/** Translated filter UI. Also pass `dateLocale` (a date-fns `Locale`, e.g. `de`) to localize the calendar. */
export const GermanFilterLabels: Story = {
  render: () => (
    <DataGrid
      columns={orderColumns}
      dataSource={{ mode: "client", data: orders }}
      getRowId={getOrderId}
      filterLabels={germanLabels}
      statusLabels={{ loading: "Wird geladen…", noResults: "Keine Treffer." }}
      initialState={{ pageSize: 10 }}
    />
  ),
};

/** Drag the trailing edge of any header to resize. */
export const ColumnResizing: Story = {
  render: () => {
    const columns = orderColumns.map((c) => ({ ...c, width: 140 }));
    return <DataGrid columns={columns} dataSource={{ mode: "client", data: orders }} getRowId={getOrderId} enableColumnResizing initialState={{ pageSize: 10 }} />;
  },
};

/** Give pinned columns an explicit width. Scroll horizontally. */
export const PinnedColumns: Story = {
  render: () => {
    const columns: ColumnDef<Order>[] = orderColumns.map((c) => ({
      ...c,
      width: 200,
      pinned: c.id === "id" ? "left" : c.id === "express" ? "right" : undefined,
    }));
    return (
      <div className="max-w-2xl">
        <DataGrid columns={columns} dataSource={{ mode: "client", data: orders }} getRowId={getOrderId} initialState={{ pageSize: 10 }} />
      </div>
    );
  },
};

/** Contiguous visible columns sharing a `headerGroup` get one spanning label above. */
export const HeaderGroups: Story = {
  render: () => {
    const groups: Record<string, string> = { customer: "Who", region: "Who", qty: "How much", amount: "How much" };
    const columns: ColumnDef<Order>[] = orderColumns.map((c) => ({ ...c, headerGroup: groups[c.id] }));
    return <DataGrid columns={columns} dataSource={{ mode: "client", data: orders }} getRowId={getOrderId} initialState={{ pageSize: 10 }} />;
  },
};

/** Custom `cell` renderer and `cellClassName`. */
export const CustomCells: Story = {
  render: () => {
    const columns: ColumnDef<Order>[] = orderColumns.map((c) => {
      if (c.id === "amount") return { ...c, cell: (v: unknown) => <strong>{chf.format(v as number)}</strong>, cellClassName: "text-right" };
      if (c.id === "status")
        return { ...c, cell: (v: unknown) => <span className={v === "overdue" ? "font-medium text-red-700 dark:text-red-300" : ""}>{String(v)}</span> };
      return c;
    });
    return <DataGrid columns={columns} dataSource={{ mode: "client", data: orders }} getRowId={getOrderId} zebra initialState={{ pageSize: 10 }} />;
  },
};
