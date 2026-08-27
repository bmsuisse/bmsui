import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef, EditedRow } from "../../src";
import { TreeDataGrid } from "../../src/tree/TreeDataGrid";

interface Node {
  id: string;
  name: string;
  hours: number;
  children?: Node[];
}

const tree: Node[] = [
  {
    id: "a",
    name: "Alpha",
    hours: 10,
    children: [{ id: "a1", name: "Alpha One", hours: 3 }],
  },
  { id: "b", name: "Beta", hours: 5 },
];

const columns: ColumnDef<Node>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name", editable: true },
  { id: "hours", type: "number", header: "Hours", accessorKey: "hours", editable: true },
];

/** Clicks a not-yet-activated cell's static content, entering that row's edit mode. */
async function activateCell(rowId: string, columnId: string): Promise<void> {
  await userEvent.click(screen.getByTestId(`cell-${rowId}-${columnId}`));
}

/** A stateful harness mirroring real usage: `onSave` actually applies edits back onto `data`. */
function EditableTree({
  onSave,
  onDiscard,
  columnsOverride,
}: {
  onSave: (edits: EditedRow<Node>[]) => void | Promise<void>;
  onDiscard?: () => void;
  columnsOverride?: ColumnDef<Node>[];
}): ReactElement {
  const [data, setData] = useState(tree);
  function applyEdits(nodes: Node[], edits: EditedRow<Node>[]): Node[] {
    return nodes.map((node) => {
      const edit = edits.find((e) => e.rowId === node.id);
      const updated = edit ? { ...node, ...edit.values } : node;
      return updated.children ? { ...updated, children: applyEdits(updated.children, edits) } : updated;
    });
  }
  return (
    <TreeDataGrid
      columns={columnsOverride ?? columns}
      data={data}
      getRowId={(row) => row.id}
      getChildren={(row) => row.children}
      initialExpandedLevel={1}
      editing={{
        onSave: async (edits) => {
          await onSave(edits);
          setData((prev) => applyEdits(prev, edits));
        },
        onDiscard,
      }}
    />
  );
}

describe("TreeDataGrid inline editing", () => {
  it("renders editable columns as static (clickable) text until clicked", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={tree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        editing={{ onSave: vi.fn() }}
      />,
    );

    expect(screen.queryByTestId("edit-b-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-b-name")).toHaveTextContent("Beta");
  });

  it("falls back to static rendering when no `editing` prop is supplied, even for an editable column", () => {
    render(
      <TreeDataGrid columns={columns} data={tree} getRowId={(row) => row.id} getChildren={(row) => row.children} />,
    );

    expect(screen.queryByTestId("cell-b-name")).not.toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("clicking one editable cell activates every editable column in that row, but no other row", async () => {
    render(<EditableTree onSave={vi.fn()} />);
    await activateCell("b", "name");

    expect(screen.getByTestId("edit-b-name")).toBeInTheDocument();
    expect(screen.getByTestId("edit-b-hours")).toBeInTheDocument();
    expect(screen.getByTestId("cell-a-name")).toHaveTextContent("Alpha"); // sibling row stays static
  });

  it("activating a second row deactivates the first — at most one row in edit mode at a time", async () => {
    render(<EditableTree onSave={vi.fn()} />);
    await activateCell("b", "name");
    expect(screen.getByTestId("edit-b-name")).toBeInTheDocument();

    await activateCell("a", "name");

    expect(screen.getByTestId("edit-a-name")).toBeInTheDocument();
    expect(screen.queryByTestId("edit-b-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-b-name")).toHaveTextContent("Beta");
  });

  it("edits a lazily-expanded child node correctly (not just root-level rows)", async () => {
    const onSave = vi.fn();
    render(<EditableTree onSave={onSave} />);

    // "a" starts expanded (initialExpandedLevel: 1) — auto-expand runs async
    // (even for already-loaded eager children, `expandToLevel` still awaits
    // `loadChildrenFor`), so wait for "a1" to actually appear.
    await userEvent.click(await screen.findByTestId("cell-a1-name"));
    const input = screen.getByTestId("edit-a1-name");
    await userEvent.clear(input);
    await userEvent.type(input, "Alpha One (renamed)");
    await userEvent.click(screen.getByTestId("tree-datagrid-save-edits"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const edits = onSave.mock.calls[0]![0] as EditedRow<Node>[];
    expect(edits).toEqual([{ rowId: "a1", row: tree[0]!.children![0], values: { name: "Alpha One (renamed)" } }]);
  });

  it("shows the Save/Discard bar (tree-scoped testids) once a value changes", async () => {
    render(<EditableTree onSave={vi.fn()} />);
    expect(screen.queryByTestId("tree-datagrid-edit-bar")).not.toBeInTheDocument();

    await activateCell("b", "hours");
    await userEvent.clear(screen.getByTestId("edit-b-hours"));
    await userEvent.type(screen.getByTestId("edit-b-hours"), "7");

    expect(screen.getByTestId("tree-datagrid-edit-bar")).toHaveTextContent("1 row changed");
    expect(screen.getByTestId("tree-datagrid-save-edits")).toHaveTextContent("Save 1 change");
  });

  it("calls onSave with the changed rows/values on Save, then clears pending state and deactivates the saved row", async () => {
    const onSave = vi.fn();
    render(<EditableTree onSave={onSave} />);
    await activateCell("b", "name");

    const nameInput = screen.getByTestId("edit-b-name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Beta Prime");
    await userEvent.click(screen.getByTestId("tree-datagrid-save-edits"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const edits = onSave.mock.calls[0]![0] as EditedRow<Node>[];
    expect(edits).toEqual([{ rowId: "b", row: tree[1], values: { name: "Beta Prime" } }]);

    expect(screen.queryByTestId("tree-datagrid-edit-bar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-b-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-b-name")).toHaveTextContent("Beta Prime");
  });

  it("Discard clears every pending edit and reverts the display", async () => {
    const onDiscard = vi.fn();
    render(<EditableTree onSave={vi.fn()} onDiscard={onDiscard} />);
    await activateCell("b", "name");

    const nameInput = screen.getByTestId("edit-b-name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Beta Prime");
    await userEvent.click(screen.getByTestId("tree-datagrid-discard-edits"));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("tree-datagrid-edit-bar")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-b-name")).toHaveTextContent("Beta");
  });

  it("validateEdit blocks Save until fixed", async () => {
    const requiredColumns: ColumnDef<Node>[] = [
      {
        ...columns[0]!,
        validateEdit: (value) => (value === "" ? "Name is required" : undefined),
      },
      columns[1]!,
    ];
    render(<EditableTree onSave={vi.fn()} columnsOverride={requiredColumns} />);
    await activateCell("b", "name");

    await userEvent.clear(screen.getByTestId("edit-b-name"));

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByTestId("tree-datagrid-save-edits")).toBeDisabled();
  });

  it("uses a custom renderEditCell over the default widget when supplied", async () => {
    const onSave = vi.fn();
    const customColumns: ColumnDef<Node>[] = [
      {
        ...columns[0]!,
        renderEditCell: (value, row, onChange) => (
          <input
            data-testid={`custom-name-editor-${row.id}`}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(event) => onChange(event.target.value)}
          />
        ),
      },
      columns[1]!,
    ];
    render(<EditableTree onSave={onSave} columnsOverride={customColumns} />);
    await activateCell("b", "name");

    const input = screen.getByTestId("custom-name-editor-b");
    await userEvent.clear(input);
    await userEvent.type(input, "Beta Prime");
    await userEvent.click(screen.getByTestId("tree-datagrid-save-edits"));

    const edits = onSave.mock.calls[0]![0] as EditedRow<Node>[];
    expect(edits[0]!.values.name).toBe("Beta Prime");
  });

  it("respects a per-row `editable` predicate", () => {
    const lockable: ColumnDef<Node>[] = [{ ...columns[0]!, editable: (row) => row.id !== "b" }];
    render(<EditableTree onSave={vi.fn()} columnsOverride={lockable} />);

    expect(screen.getByTestId("cell-a-name")).toBeInTheDocument(); // "a": editable
    expect(screen.queryByTestId("cell-b-name")).not.toBeInTheDocument(); // "b": locked
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });
});
