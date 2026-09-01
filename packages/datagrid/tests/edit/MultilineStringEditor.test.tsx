import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { MultilineStringEditor } from "../../src/edit/MultilineStringEditor";
import type { StringColumn } from "../../src/column/types";

interface Row {
  notes: string;
}

const column: StringColumn<Row> = { id: "notes", type: "string", header: "Notes", multiline: true };

describe("MultilineStringEditor", () => {
  it("renders a textarea (not a single-line input), seeded with the current value", () => {
    render(<MultilineStringEditor column={column} rowId="1" value="Line one" onChange={vi.fn()} />);
    const textarea = screen.getByTestId("edit-1-notes");
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveValue("Line one");
  });

  it("renders an empty textarea for null/undefined, not the literal string 'null'/'undefined'", () => {
    const { rerender } = render(<MultilineStringEditor column={column} rowId="1" value={null} onChange={vi.fn()} />);
    expect(screen.getByTestId("edit-1-notes")).toHaveValue("");
    rerender(<MultilineStringEditor column={column} rowId="1" value={undefined} onChange={vi.fn()} />);
    expect(screen.getByTestId("edit-1-notes")).toHaveValue("");
  });

  it("calls onChange with the full new text, including an embedded newline, on every keystroke", async () => {
    // A REAL stateful wrapper, not a static `value` prop — React enforces a
    // controlled input's value against the DOM after every native edit, so
    // a `value` that never advances would otherwise get silently reset
    // between keystrokes, masking whether multi-character typing actually
    // works (this is the same reason `EditableGrid`/`CellEditingGrid`
    // elsewhere in this suite always route `onChange`/`onCellsChange` back
    // into real state).
    const onChange = vi.fn();
    function Stateful(): ReactElement {
      const [value, setValue] = useState("");
      return (
        <MultilineStringEditor
          column={column}
          rowId="1"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next as string);
          }}
        />
      );
    }
    render(<Stateful />);
    await userEvent.type(screen.getByTestId("edit-1-notes"), "a{enter}b");
    expect(onChange).toHaveBeenLastCalledWith("a\nb");
  });

  it("shows the validation error and marks the field aria-invalid, associated via aria-describedby", () => {
    render(<MultilineStringEditor column={column} rowId="1" value="" onChange={vi.fn()} error="Too long" />);
    const textarea = screen.getByTestId("edit-1-notes");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Too long")).toHaveAttribute("id", textarea.getAttribute("aria-describedby"));
  });

  it("shows no error UI when there is none", () => {
    render(<MultilineStringEditor column={column} rowId="1" value="" onChange={vi.fn()} />);
    expect(screen.getByTestId("edit-1-notes")).not.toHaveAttribute("aria-invalid");
  });

  it("forwards autoFocus to the underlying textarea", () => {
    render(<MultilineStringEditor column={column} rowId="1" value="" onChange={vi.fn()} autoFocus />);
    expect(screen.getByTestId("edit-1-notes")).toHaveFocus();
  });
});
