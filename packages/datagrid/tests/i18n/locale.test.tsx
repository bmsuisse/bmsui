import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef, EnumColumn } from "../../src/column/types";
import { EnumFilter } from "../../src/filter/EnumFilter";
import { FilterLabelsProvider, defaultFilterLabels, filterLabelsFor } from "../../src/filter/labels";
import { DataGrid } from "../../src/grid/DataGrid";
import { TreeDataGrid } from "../../src/tree/TreeDataGrid";
import { BmsLocaleProvider, getI18n } from "../../src/i18n/locale";

interface Row {
  id: string;
  status: string;
}

const statusColumn: EnumColumn<Row> = {
  id: "status",
  type: "enum",
  header: "Status",
  options: [
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ],
};

describe("filterLabelsFor", () => {
  it("is the English default for en", () => {
    expect(filterLabelsFor(getI18n("en")).selectAll).toBe(defaultFilterLabels.selectAll);
    expect(defaultFilterLabels.dateLocale).toBeUndefined();
  });

  it("covers every FilterLabels key in each language", () => {
    for (const locale of ["de", "fr", "it", "nl", "es"]) {
      expect(Object.keys(filterLabelsFor(getI18n(locale))).sort()).toEqual(Object.keys(defaultFilterLabels).sort());
    }
  });

  it("translates operator words, templates and plurals", () => {
    const de = filterLabelsFor(getI18n("de-CH"));
    expect(de.operatorLabel("startsWith")).toBe("beginnt mit");
    expect(de.filterAriaLabel("Status")).toBe("Status filtern");
    expect(de.dateLocale?.code).toBe("de");
    expect(filterLabelsFor(getI18n("fr")).selectedCount(0)).toBe("0 sélectionné");
  });
});

describe("<BmsLocaleProvider>", () => {
  it("translates the built-in filter widgets", async () => {
    render(
      <BmsLocaleProvider locale="de">
        <EnumFilter column={statusColumn} value={undefined} onChange={vi.fn()} />
      </BmsLocaleProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Status filtern" }));
    expect(screen.getByPlaceholderText("Status suchen...")).toBeInTheDocument();
    expect(screen.getByText("Alle auswählen")).toBeInTheDocument();
  });

  it("lets filterLabels win over the locale's texts, key by key", async () => {
    render(
      <BmsLocaleProvider locale="de">
        <FilterLabelsProvider labels={{ selectAll: "Tous" }}>
          <EnumFilter column={statusColumn} value={undefined} onChange={vi.fn()} />
        </FilterLabelsProvider>
      </BmsLocaleProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Status filtern" }));
    expect(screen.getByText("Tous")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Status suchen...")).toBeInTheDocument();
  });

  it("lets a widget's own labels win over a provider's", async () => {
    render(
      <BmsLocaleProvider locale="de">
        <FilterLabelsProvider labels={{ selectAll: "Provider" }}>
          <EnumFilter column={statusColumn} value={undefined} onChange={vi.fn()} labels={{ selectAll: "Widget" }} />
        </FilterLabelsProvider>
      </BmsLocaleProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Status filtern" }));
    expect(screen.getByText("Widget")).toBeInTheDocument();
  });
});

interface GridRow {
  id: string;
  name: string;
  children?: GridRow[];
}

const columns: ColumnDef<GridRow>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name", filterable: true, editable: true },
];
const rows: GridRow[] = [{ id: "1", name: "Alpha" }];
const client = (data: GridRow[]) => ({ mode: "client" as const, data });

describe("<DataGrid locale>", () => {
  it("stays English without a locale", () => {
    render(<DataGrid columns={columns} dataSource={client(rows)} getRowId={(r) => r.id} />);
    expect(screen.getByRole("button", { name: "Filter Name" })).toBeInTheDocument();
  });

  it("translates the grid and its filters", () => {
    render(<DataGrid columns={columns} dataSource={client(rows)} getRowId={(r) => r.id} locale="de-CH" />);
    expect(screen.getByRole("button", { name: "Name filtern" })).toBeInTheDocument();
  });

  it("translates the empty state and lets statusLabels win", () => {
    const { rerender } = render(<DataGrid columns={columns} dataSource={client([])} getRowId={(r) => r.id} locale="fr" />);
    expect(screen.getByText("Aucun résultat.")).toBeInTheDocument();
    rerender(
      <DataGrid columns={columns} dataSource={client([])} getRowId={(r) => r.id} locale="fr" statusLabels={{ noResults: "Rien" }} />,
    );
    expect(screen.getByText("Rien")).toBeInTheDocument();
  });

  it("takes the locale from an enclosing provider, the prop overriding it", () => {
    render(
      <BmsLocaleProvider locale="it">
        <DataGrid columns={columns} dataSource={client([])} getRowId={(r) => r.id} />
        <DataGrid columns={columns} dataSource={client([])} getRowId={(r) => r.id} locale="es" />
      </BmsLocaleProvider>,
    );
    expect(screen.getByText("Nessun risultato.")).toBeInTheDocument();
    expect(screen.getByText("Sin resultados.")).toBeInTheDocument();
  });

  it("translates row selection and action labels", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={client(rows)}
        getRowId={(r) => r.id}
        locale="de"
        selectedIds={new Set()}
        onSelectedIdsChange={() => {}}
        rowActions={[{ id: "x", label: "X", onSelect: () => {} }]}
      />,
    );
    expect(screen.getByLabelText("Zeile 1 auswählen")).toBeInTheDocument();
    expect(screen.getByLabelText("Alle Zeilen dieser Seite auswählen")).toBeInTheDocument();
    expect(screen.getByLabelText("Aktionen für Zeile 1")).toBeInTheDocument();
  });

  it("translates the pagination and the bulk-selection summary", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={client(rows)}
        getRowId={(r) => r.id}
        locale="de"
        headerActions={[{ id: "x", label: "X", onSelect: () => {} }]}
        selectedIds={new Set(["1"])}
        onSelectedIdsChange={() => {}}
      />,
    );
    expect(screen.getByText("Seite 1 von 1 (1 Zeile)")).toBeInTheDocument();
    expect(screen.getByText("Zurück")).toBeInTheDocument();
    expect(screen.getByText("Weiter")).toBeInTheDocument();
    expect(screen.getByText("1 ausgewählt")).toBeInTheDocument();
  });

  it("translates the editing bar, with plurals", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={client(rows)}
        getRowId={(r) => r.id}
        locale="fr"
        editing={{ onSave: vi.fn() }}
      />,
    );
    await userEvent.click(screen.getByTestId("cell-1-name"));
    await userEvent.type(screen.getByTestId("edit-1-name"), "x");
    expect(screen.getByText("1 ligne modifiée")).toBeInTheDocument();
    expect(screen.getByText("Enregistrer 1 modification")).toBeInTheDocument();
    expect(screen.getByText("Annuler")).toBeInTheDocument();
  });
});

describe("<TreeDataGrid locale>", () => {
  it("translates the tree controls", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={[{ id: "1", name: "Alpha", children: [{ id: "2", name: "Beta" }] }]}
        getRowId={(r) => r.id}
        getChildren={(r) => r.children}
        locale="es"
        selectedIds={new Set()}
        onSelectedIdsChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Expandir" })).toBeInTheDocument();
    expect(screen.getByLabelText("Seleccionar la fila 1")).toBeInTheDocument();
  });
});
