import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ActiveFilterBar,
  BooleanFilter,
  type BooleanColumn,
  type ColumnDef,
  DataGrid,
  DateRangeFilter,
  decodeGridStateSearch,
  encodeGridStateSearch,
  type DateColumn,
  type EnumColumn,
  EnumFilter,
  facetedNumberValues,
  facetedSetOptions,
  type FilterDescriptor,
  type FilterLabels,
  FilterLabelsProvider,
  type GridState,
  NumberComparisonFilter,
  NumberHistogramFilter,
  type NumberColumn,
  NumberRangeFilter,
  type StringColumn,
  StringFilter,
} from "@bmsuisse/datagrid";
import { useState, type ReactNode } from "react";

const meta: Meta = { title: "DataGrid/Filters", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

function Show({ value, children }: { value: FilterDescriptor | undefined; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div>{children}</div>
      <pre className="rounded bg-muted p-2 text-xs">{JSON.stringify(value ?? null, null, 2)}</pre>
    </div>
  );
}

interface Row {
  name: string;
  status: string;
  paid: boolean;
  amount: number;
  created: string;
}

const nameCol: StringColumn<Row> = { id: "name", type: "string", header: "Name", accessorKey: "name" };
const statusCol: EnumColumn<Row> = {
  id: "status",
  type: "enum",
  header: "Status",
  accessorKey: "status",
  options: [
    { value: "pending", label: "Pending", group: "Open" },
    { value: "shipped", label: "Shipped", group: "Open" },
    { value: "delivered", label: "Delivered", group: "Closed" },
    { value: "cancelled", label: "Cancelled", group: "Closed" },
  ],
};
const paidCol: BooleanColumn<Row> = { id: "paid", type: "boolean", header: "Paid", accessorKey: "paid" };
const amountCol: NumberColumn<Row> = { id: "amount", type: "number", header: "Amount", accessorKey: "amount" };
const createdCol: DateColumn<Row> = { id: "created", type: "date", header: "Created", accessorKey: "created" };

export const StringText: Story = {
  render: () => {
    const [value, setValue] = useState<FilterDescriptor | undefined>();
    return (
      <Show value={value}>
        <StringFilter column={nameCol} value={value} onChange={setValue} />
      </Show>
    );
  },
};

export const Enum: Story = {
  render: () => {
    const [value, setValue] = useState<FilterDescriptor | undefined>();
    return (
      <Show value={value}>
        <EnumFilter column={statusCol} value={value} onChange={setValue} />
      </Show>
    );
  },
};

export const EnumWithCountsAndExclude: Story = {
  render: () => {
    const [value, setValue] = useState<FilterDescriptor | undefined>();
    return (
      <Show value={value}>
        <EnumFilter
          column={statusCol}
          value={value}
          onChange={setValue}
          allowExclude
          options={[
            { value: "pending", label: "Pending", count: 12 },
            { value: "shipped", label: "Shipped", count: 7 },
            { value: "delivered", label: "Delivered", count: 31 },
            { value: "cancelled", label: "Cancelled", count: 0 },
          ]}
        />
      </Show>
    );
  },
};

export const BooleanYesNo: Story = {
  render: () => {
    const [value, setValue] = useState<FilterDescriptor | undefined>();
    return (
      <Show value={value}>
        <BooleanFilter column={paidCol} value={value} onChange={setValue} />
      </Show>
    );
  },
};

export const NumberRange: Story = {
  render: () => {
    const [value, setValue] = useState<FilterDescriptor | undefined>();
    return (
      <Show value={value}>
        <NumberRangeFilter column={amountCol} value={value} onChange={setValue} />
      </Show>
    );
  },
};

export const NumberComparison: Story = {
  render: () => {
    const [value, setValue] = useState<FilterDescriptor | undefined>();
    return (
      <Show value={value}>
        <NumberComparisonFilter column={amountCol} value={value} onChange={setValue} />
      </Show>
    );
  },
};

export const DateRange: Story = {
  render: () => {
    const [value, setValue] = useState<FilterDescriptor | undefined>();
    return (
      <Show value={value}>
        <DateRangeFilter column={createdCol} value={value} onChange={setValue} />
      </Show>
    );
  },
};

// --- histogram ----------------------------------------------------------------
interface Product {
  id: string;
  name: string;
  price: number;
  rating: number;
}
const PRODUCTS: Product[] = [
  { id: "p1", name: "Widget", price: 12, rating: 3 },
  { id: "p2", name: "Gadget", price: 45, rating: 4 },
  { id: "p3", name: "Gizmo", price: 89, rating: 2 },
  { id: "p4", name: "Doohickey", price: 199, rating: 5 },
  { id: "p5", name: "Contraption", price: 340, rating: 4 },
  { id: "p6", name: "Thingamajig", price: 15, rating: 1 },
  { id: "p7", name: "Whatsit", price: 620, rating: 5 },
  { id: "p8", name: "Gubbins", price: 72, rating: 3 },
];
const priceCol: NumberColumn<Product> = { id: "price", type: "number", header: "Price", accessorKey: "price" };
const ratingCol: NumberColumn<Product> = { id: "rating", type: "number", header: "Rating", accessorKey: "rating" };

export const NumberHistogramPopover: Story = {
  render: () => {
    const [value, setValue] = useState<FilterDescriptor | undefined>();
    return (
      <Show value={value}>
        <NumberHistogramFilter
          bare={false}
          column={priceCol}
          value={value}
          onChange={setValue}
          allValues={PRODUCTS.map((p) => p.price)}
          format={(v) => `CHF ${v.toLocaleString()}`}
        />
      </Show>
    );
  },
};

export const NumberHistogramBare: Story = {
  render: () => {
    const [value, setValue] = useState<FilterDescriptor | undefined>();
    return (
      <Show value={value}>
        <div className="w-72">
          <NumberHistogramFilter
            bare
            column={priceCol}
            value={value}
            onChange={setValue}
            allValues={PRODUCTS.map((p) => p.price)}
          />
        </div>
      </Show>
    );
  },
};

const productColumns: ColumnDef<Product>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
  {
    ...priceCol,
    filterable: true,
    filterDisplay: "row",
    renderFilter: (value, onChange, filter) => (
      <NumberHistogramFilter
        bare={false}
        column={priceCol}
        value={value}
        onChange={onChange}
        allValues={facetedNumberValues(PRODUCTS, priceCol, filter)}
      />
    ),
  },
  {
    ...ratingCol,
    filterable: true,
    filterDisplay: "row",
    renderFilter: (value, onChange, filter) => (
      <NumberHistogramFilter
        bare={false}
        column={ratingCol}
        value={value}
        onChange={onChange}
        allValues={facetedNumberValues(PRODUCTS, ratingCol, filter)}
      />
    ),
  },
];

export const FacetedNumberFiltersInGrid: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Each histogram's domain ignores its own filter but respects the other column's.
      </p>
      <DataGrid columns={productColumns} dataSource={{ mode: "client", data: PRODUCTS }} getRowId={(row) => row.id} />
    </div>
  ),
};

// --- faceted sets, active bar, url codec --------------------------------------
interface Shipment {
  id: string;
  region: string;
  carrier: string;
  weight: number;
}
const REGIONS = ["EMEA", "APAC", "AMER", "LATAM"];
const CARRIERS = ["DHL", "UPS", "FedEx", "Post", "Planzer"];
const SHIPMENTS: Shipment[] = Array.from({ length: 40 }, (_, i) => ({
  id: `s${i + 1}`,
  region: REGIONS[i % REGIONS.length]!,
  carrier: CARRIERS[(i * 3) % CARRIERS.length]!,
  weight: ((i * 37) % 90) + 1,
}));

function facetColumn(column: ColumnDef<Shipment>): ColumnDef<Shipment> {
  return {
    ...column,
    sortable: true,
    filterable: true,
    renderFilter: (value, onChange, filter) => (
      <EnumFilter
        bare
        allowExclude
        column={column}
        value={value}
        onChange={onChange}
        options={facetedSetOptions(SHIPMENTS, column, filter)}
      />
    ),
  };
}

const shipmentColumns: ColumnDef<Shipment>[] = [
  { id: "id", type: "string", header: "Shipment", accessorKey: "id" },
  facetColumn({ id: "region", type: "string", header: "Region", accessorKey: "region" }),
  facetColumn({ id: "carrier", type: "string", header: "Carrier", accessorKey: "carrier" }),
  { id: "weight", type: "number", header: "Weight (kg)", accessorKey: "weight", sortable: true, filterable: true },
];

const INITIAL_STATE: GridState = { filter: null, sort: [], page: 0, pageSize: 10 };

export const FacetedSetOptions: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Region and Carrier list counts narrowed by the other filters, with an "is none of" toggle.
      </p>
      <DataGrid
        columns={shipmentColumns}
        dataSource={{ mode: "client", data: SHIPMENTS }}
        getRowId={(row) => row.id}
        initialState={INITIAL_STATE}
      />
    </div>
  ),
};

export const ActiveFilterBarWithGrid: Story = {
  render: () => {
    const [gridState, setGridState] = useState<GridState>(INITIAL_STATE);
    return (
      <div className="flex flex-col gap-2">
        <ActiveFilterBar
          filter={gridState.filter}
          columns={shipmentColumns}
          onFilterChange={(filter) => setGridState({ ...gridState, filter, page: 0 })}
        />
        <DataGrid
          columns={shipmentColumns}
          dataSource={{ mode: "client", data: SHIPMENTS }}
          getRowId={(row) => row.id}
          gridState={gridState}
          onGridStateChange={setGridState}
        />
      </div>
    );
  },
};

export const UrlCodec: Story = {
  render: () => {
    const [gridState, setGridState] = useState<GridState>(INITIAL_STATE);
    const encoded = encodeGridStateSearch(gridState, "x");
    const roundTrip = decodeGridStateSearch(encoded, "x");
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Filter or sort the grid; the compact URL form of the state is shown below (tuples are [field, op, value?]).
        </p>
        <DataGrid
          columns={shipmentColumns}
          dataSource={{ mode: "client", data: SHIPMENTS }}
          getRowId={(row) => row.id}
          gridState={gridState}
          onGridStateChange={setGridState}
        />
        <pre className="rounded bg-muted p-2 text-xs">encodeGridStateSearch: {JSON.stringify(encoded, null, 2)}</pre>
        <pre className="rounded bg-muted p-2 text-xs">
          decodeGridStateSearch: {JSON.stringify({ filter: roundTrip.filter, sort: roundTrip.sort }, null, 2)}
        </pre>
      </div>
    );
  },
};

// --- German labels ------------------------------------------------------------
const GERMAN: Partial<FilterLabels> = {
  filterAriaLabel: (header) => `${header} filtern`,
  searchPlaceholder: (header) => `${header} suchen…`,
  selectAll: "Alle auswählen",
  selectAllOfGroup: (group) => `Alle in ${group} auswählen`,
  noMatches: "Keine Treffer.",
  selectedCount: (count) => `${count} ausgewählt`,
  stringPlaceholder: (header) => `${header} filtern…`,
  stringContains: "Enthält",
  stringIs: "Ist",
  stringStartsWith: "Beginnt mit",
  stringEndsWith: "Endet mit",
  operatorAriaLabel: (header) => `${header}: Filteroperator`,
  booleanAll: "Alle",
  booleanYes: "Ja",
  booleanNo: "Nein",
  minPlaceholder: "Min.",
  maxPlaceholder: "Max.",
  valuePlaceholder: "Wert",
  rangeSeparator: "bis",
  numberGreaterThan: "Grösser als",
  numberGreaterThanOrEqual: "Grösser als oder gleich",
  numberLessThan: "Kleiner als",
  numberLessThanOrEqual: "Kleiner als oder gleich",
  numberEquals: "Gleich",
  numberNotEquals: "Ungleich",
  numberBetween: "Zwischen",
  clear: "Zurücksetzen",
  dateToday: "Heute",
  dateLast7Days: "Letzte 7 Tage",
  dateThisMonth: "Dieser Monat",
  dateCustom: "Benutzerdefiniert",
  enumIsAnyOf: "ist eines von",
  enumIsNoneOf: "ist keines von",
  activeFilters: (count) => `Filter (${count}):`,
  noActiveFilters: "Keine Filter",
  clearAllFilters: "Alle Filter entfernen",
};

export const GermanLabels: Story = {
  render: () => {
    const [name, setName] = useState<FilterDescriptor | undefined>();
    const [status, setStatus] = useState<FilterDescriptor | undefined>();
    const [paid, setPaid] = useState<FilterDescriptor | undefined>();
    const [amount, setAmount] = useState<FilterDescriptor | undefined>();
    const [created, setCreated] = useState<FilterDescriptor | undefined>();
    return (
      <FilterLabelsProvider labels={GERMAN}>
        <div className="flex flex-wrap items-start gap-4">
          <StringFilter column={nameCol} value={name} onChange={setName} />
          <EnumFilter column={statusCol} value={status} onChange={setStatus} allowExclude />
          <BooleanFilter column={paidCol} value={paid} onChange={setPaid} />
          <NumberComparisonFilter column={amountCol} value={amount} onChange={setAmount} />
          <DateRangeFilter column={createdCol} value={created} onChange={setCreated} />
        </div>
      </FilterLabelsProvider>
    );
  },
};
