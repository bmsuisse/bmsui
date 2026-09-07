import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import { ColumnSelector } from "../../src/column-selector/ColumnSelector";
import {
  orderStorageKeyFor,
  storageKeyFor,
  writePersistedColumnOrder,
  writePersistedVisibility,
} from "../../src/column-selector/persistence";
import type { ColumnVisibility } from "../../src/column-selector/types";

interface Row {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const columns: ColumnDef<Row>[] = [
  { id: "id", type: "string", header: "ID" },
  { id: "name", type: "string", header: "Name", group: "Contact" },
  { id: "email", type: "string", header: "Email", group: "Contact" },
  { id: "phone", type: "string", header: "Phone" },
];

afterEach(() => {
  window.localStorage.clear();
});

async function openDialog(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "Choose columns" }));
  await screen.findByRole("dialog");
}

describe("ColumnSelector: grouping", () => {
  it("renders an unlabeled section for ungrouped columns first, then named groups", async () => {
    render(<ColumnSelector columns={columns} visibility={{}} onVisibilityChange={vi.fn()} />);
    await openDialog();

    // Named group: a plain label, no bulk-select affordance of any kind.
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Select all in/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Clear all in/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("ID")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("checks a column's checkbox according to the visibility prop", async () => {
    render(
      <ColumnSelector
        columns={columns}
        visibility={{ email: false }}
        onVisibilityChange={vi.fn()}
      />,
    );
    await openDialog();

    expect(screen.getByLabelText("Email")).not.toBeChecked();
    expect(screen.getByLabelText("Name")).toBeChecked();
  });
});

describe("ColumnSelector: toggling a single column", () => {
  it("calls onVisibilityChange with the column flipped", async () => {
    const onVisibilityChange = vi.fn();
    render(
      <ColumnSelector columns={columns} visibility={{}} onVisibilityChange={onVisibilityChange} />,
    );
    await openDialog();

    await userEvent.click(screen.getByLabelText("Email"));

    expect(onVisibilityChange).toHaveBeenCalledWith(expect.objectContaining({ email: false }));
  });

  it("blocks unchecking the last visible column", async () => {
    const onVisibilityChange = vi.fn();
    const allHiddenButOne: ColumnVisibility = { name: false, email: false, phone: false };
    render(
      <ColumnSelector
        columns={columns}
        visibility={allHiddenButOne}
        onVisibilityChange={onVisibilityChange}
      />,
    );
    await openDialog();

    const idCheckbox = screen.getByLabelText("ID");
    expect(idCheckbox).toBeDisabled();

    await userEvent.click(idCheckbox);
    expect(onVisibilityChange).not.toHaveBeenCalled();
  });
});

describe("ColumnSelector: localStorage persistence", () => {
  it("restores from localStorage on mount, calling onVisibilityChange once", async () => {
    writePersistedVisibility("orders", { email: false });
    const onVisibilityChange = vi.fn();
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={onVisibilityChange}
        persistKey="orders"
      />,
    );

    expect(onVisibilityChange).toHaveBeenCalledTimes(1);
    expect(onVisibilityChange).toHaveBeenCalledWith(expect.objectContaining({ email: false }));
  });

  it("does not call onVisibilityChange on mount when nothing is stored", () => {
    const onVisibilityChange = vi.fn();
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={onVisibilityChange}
        persistKey="orders"
      />,
    );
    expect(onVisibilityChange).not.toHaveBeenCalled();
  });

  it("does not throw, and doesn't restore, when the stored value is malformed JSON", () => {
    window.localStorage.setItem(storageKeyFor("orders"), "{not-json");
    const onVisibilityChange = vi.fn();
    expect(() =>
      render(
        <ColumnSelector
          columns={columns}
          visibility={{}}
          onVisibilityChange={onVisibilityChange}
          persistKey="orders"
        />,
      ),
    ).not.toThrow();
    expect(onVisibilityChange).not.toHaveBeenCalled();
  });

  it("writes to localStorage on every subsequent user-driven change", async () => {
    const onVisibilityChange = vi.fn();
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={onVisibilityChange}
        persistKey="orders"
      />,
    );
    await openDialog();

    await userEvent.click(screen.getByLabelText("Email"));

    expect(JSON.parse(window.localStorage.getItem(storageKeyFor("orders")) ?? "{}")).toEqual(
      expect.objectContaining({ email: false }),
    );
  });

  it("does not touch localStorage at all when persistKey is omitted", async () => {
    render(<ColumnSelector columns={columns} visibility={{}} onVisibilityChange={vi.fn()} />);
    await openDialog();

    await userEvent.click(screen.getByLabelText("Email"));

    expect(window.localStorage.length).toBe(0);
  });
});

describe("ColumnSelector: drag-to-reorder", () => {
  it("renders no drag handles when columnOrder/onColumnOrderChange are omitted", async () => {
    render(<ColumnSelector columns={columns} visibility={{}} onVisibilityChange={vi.fn()} />);
    await openDialog();

    for (const row of screen.getAllByRole("checkbox")) {
      expect(row.closest("label")).toHaveAttribute("draggable", "false");
    }
  });

  it("renders drag handles once both columnOrder and onColumnOrderChange are given", async () => {
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={vi.fn()}
        columnOrder={["id", "name", "email", "phone"]}
        onColumnOrderChange={vi.fn()}
      />,
    );
    await openDialog();

    const idRow = screen.getByLabelText("ID").closest("label");
    expect(idRow).toHaveAttribute("draggable", "true");
  });

  it("renders groups in columnOrder's order, not columns' own array order", async () => {
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={vi.fn()}
        // Reverses Contact's two members (name/email) relative to `columns`' own order.
        columnOrder={["id", "phone", "email", "name"]}
        onColumnOrderChange={vi.fn()}
      />,
    );
    await openDialog();

    const contactLabels = screen
      .getAllByRole("checkbox")
      .map((checkbox) => checkbox.closest("label")?.textContent)
      .filter((text): text is string => text === "Email" || text === "Name");
    expect(contactLabels).toEqual(["Email", "Name"]);
  });

  it("commits a moved column via onColumnOrderChange on drop", async () => {
    const onColumnOrderChange = vi.fn();
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={vi.fn()}
        columnOrder={["id", "name", "email", "phone"]}
        onColumnOrderChange={onColumnOrderChange}
      />,
    );
    await openDialog();

    const emailRow = screen.getByLabelText("Email").closest("label")!;
    const idRow = screen.getByLabelText("ID").closest("label")!;

    // `fireEvent` (not raw `dispatchEvent`) -- it wraps each dispatch in
    // `act()`, flushing the `draggedId` state update from dragstart before
    // the drop handler reads it. userEvent has no built-in drag simulation
    // (real drag-and-drop needs a live DataTransfer jsdom doesn't
    // implement), so this fires the same event sequence the browser would.
    fireEvent.dragStart(emailRow);
    fireEvent.dragOver(idRow);
    fireEvent.drop(idRow);

    expect(onColumnOrderChange).toHaveBeenCalledWith(["email", "id", "name", "phone"]);
  });

  it("does not call onColumnOrderChange when dropping a column onto itself", async () => {
    const onColumnOrderChange = vi.fn();
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={vi.fn()}
        columnOrder={["id", "name", "email", "phone"]}
        onColumnOrderChange={onColumnOrderChange}
      />,
    );
    await openDialog();

    const emailRow = screen.getByLabelText("Email").closest("label")!;
    fireEvent.dragStart(emailRow);
    fireEvent.dragOver(emailRow);
    fireEvent.drop(emailRow);

    expect(onColumnOrderChange).not.toHaveBeenCalled();
  });
});

describe("ColumnSelector: column-order localStorage persistence", () => {
  it("restores a persisted order on mount, calling onColumnOrderChange once", () => {
    writePersistedColumnOrder("orders", ["email", "id", "name", "phone"]);
    const onColumnOrderChange = vi.fn();
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={vi.fn()}
        columnOrder={["id", "name", "email", "phone"]}
        onColumnOrderChange={onColumnOrderChange}
        persistKey="orders"
      />,
    );

    expect(onColumnOrderChange).toHaveBeenCalledTimes(1);
    expect(onColumnOrderChange).toHaveBeenCalledWith(["email", "id", "name", "phone"]);
  });

  it("does not restore order when onColumnOrderChange is omitted, even with a persistKey set", () => {
    writePersistedColumnOrder("orders", ["email", "id", "name", "phone"]);
    const onVisibilityChange = vi.fn();
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={onVisibilityChange}
        persistKey="orders"
      />,
    );
    // Only the visibility restore effect could have fired here -- nothing
    // was ever persisted under the plain (non-order) storage key.
    expect(onVisibilityChange).not.toHaveBeenCalled();
  });

  it("writes the new order to localStorage on drop", async () => {
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={vi.fn()}
        columnOrder={["id", "name", "email", "phone"]}
        onColumnOrderChange={vi.fn()}
        persistKey="orders"
      />,
    );
    await openDialog();

    const emailRow = screen.getByLabelText("Email").closest("label")!;
    const idRow = screen.getByLabelText("ID").closest("label")!;
    fireEvent.dragStart(emailRow);
    fireEvent.dragOver(idRow);
    fireEvent.drop(idRow);

    expect(JSON.parse(window.localStorage.getItem(orderStorageKeyFor("orders")) ?? "[]")).toEqual([
      "email",
      "id",
      "name",
      "phone",
    ]);
  });

  it("does not touch localStorage's order key when persistKey is omitted", async () => {
    render(
      <ColumnSelector
        columns={columns}
        visibility={{}}
        onVisibilityChange={vi.fn()}
        columnOrder={["id", "name", "email", "phone"]}
        onColumnOrderChange={vi.fn()}
      />,
    );
    await openDialog();

    const emailRow = screen.getByLabelText("Email").closest("label")!;
    const idRow = screen.getByLabelText("ID").closest("label")!;
    fireEvent.dragStart(emailRow);
    fireEvent.dragOver(idRow);
    fireEvent.drop(idRow);

    expect(window.localStorage.getItem(orderStorageKeyFor("orders"))).toBeNull();
  });
});
