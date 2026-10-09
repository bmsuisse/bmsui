import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import { DataGrid } from "../../src/grid/DataGrid";
import { TreeDataGrid } from "../../src/tree/TreeDataGrid";

interface Row {
  id: string;
  name: string;
}
const columns: ColumnDef<Row>[] = [{ id: "name", type: "string", header: "Name", accessorKey: "name" }];
const rows: Row[] = [{ id: "1", name: "Alpha" }];
const client = (data: Row[]) => ({ mode: "client" as const, data });

describe("DataGrid status states", () => {
  it("shows skeleton rows (not 'No results.') on first load", () => {
    render(<DataGrid columns={columns} dataSource={client([])} getRowId={(r) => r.id} loading />);
    expect(screen.getByTestId("grid-loading-rows")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("No results.")).not.toBeInTheDocument();
  });

  it("shows an error state instead of 'No results.' when the fetch failed with no rows, and Retry works", () => {
    const onRetry = vi.fn();
    render(
      <DataGrid
        columns={columns}
        dataSource={client([])}
        getRowId={(r) => r.id}
        error={{ title: "Query failed", message: "timeout", details: "HTTP 504" }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("Query failed")).toBeInTheDocument();
    expect(screen.getByText("timeout")).toBeInTheDocument();
    expect(screen.queryByText("No results.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("keeps stale rows and shows a banner when the refetch failed", () => {
    render(<DataGrid columns={columns} dataSource={client(rows)} getRowId={(r) => r.id} error="offline" />);
    expect(screen.getByTestId("row-1")).toBeInTheDocument();
    expect(screen.getByTestId("grid-inline-error")).toHaveTextContent("offline");
    expect(screen.queryByTestId("grid-error-state")).not.toBeInTheDocument();
  });

  it("translates status strings via statusLabels", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={client([])}
        getRowId={(r) => r.id}
        statusLabels={{ noResults: "Keine Resultate." }}
      />,
    );
    expect(screen.getByText("Keine Resultate.")).toBeInTheDocument();
  });

  it("shows a thin refresh bar (not a blocking overlay) while refetching with rows", () => {
    render(<DataGrid columns={columns} dataSource={client(rows)} getRowId={(r) => r.id} loading />);
    expect(screen.getByTestId("datagrid-loading-overlay")).toHaveAttribute("role", "progressbar");
  });
});

describe("TreeDataGrid status states", () => {
  const props = { columns, getRowId: (r: Row) => r.id, getChildren: () => undefined };
  it("shows an error state with Retry when the root fetch failed", () => {
    const onRetry = vi.fn();
    render(<TreeDataGrid {...props} data={[]} error="nope" onRetry={onRetry} />);
    expect(screen.getByTestId("grid-error-state")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows a banner over stale rows", () => {
    render(<TreeDataGrid {...props} data={rows} error="nope" />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByTestId("grid-inline-error")).toBeInTheDocument();
  });
});
