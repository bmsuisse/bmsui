import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCellSelection } from "../../src/cell-editing/useCellSelection";

const rowIds = ["r1", "r2", "r3"];
const columnIds = ["a", "b", "c"];

function setup(onNavigateToRow?: (rowId: string) => void) {
  return renderHook(() => useCellSelection({ rowIds, columnIds, onNavigateToRow }));
}

describe("useCellSelection", () => {
  it("starts with no selection", () => {
    const { result } = setup();
    expect(result.current.selection).toBeUndefined();
    expect(result.current.effectiveRange).toBeUndefined();
  });

  it("startSelection selects a single cell and opens a drag", () => {
    const { result } = setup();
    act(() => result.current.startSelection({ rowId: "r1", columnId: "a" }));
    expect(result.current.selection).toEqual({ anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } });
    expect(result.current.isDragging).toBe(true);
  });

  it("a plain click (startSelection then endDrag with no updateDrag) leaves a single-cell selection", () => {
    const { result } = setup();
    act(() => result.current.startSelection({ rowId: "r2", columnId: "b" }));
    act(() => result.current.endDrag());
    expect(result.current.isDragging).toBe(false);
    expect(result.current.selection).toEqual({ anchor: { rowId: "r2", columnId: "b" }, focus: { rowId: "r2", columnId: "b" } });
  });

  it("updateDrag extends effectiveRange live without touching the committed selection until endDrag", () => {
    const { result } = setup();
    act(() => result.current.startSelection({ rowId: "r1", columnId: "a" }));
    act(() => result.current.updateDrag({ rowId: "r2", columnId: "b" }));
    expect(result.current.effectiveRange).toEqual({ anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r2", columnId: "b" } });
    expect(result.current.selection).toEqual({ anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } });

    act(() => result.current.endDrag());
    expect(result.current.selection).toEqual({ anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r2", columnId: "b" } });
    expect(result.current.effectiveRange).toEqual(result.current.selection);
  });

  it("updateDrag/endDrag are no-ops when not currently dragging", () => {
    const { result } = setup();
    act(() => result.current.updateDrag({ rowId: "r2", columnId: "b" }));
    expect(result.current.selection).toBeUndefined();
    act(() => result.current.endDrag());
    expect(result.current.selection).toBeUndefined();
  });

  it("shift+mousedown (extend) keeps the existing anchor and moves only the focus", () => {
    const { result } = setup();
    act(() => result.current.startSelection({ rowId: "r1", columnId: "a" }));
    act(() => result.current.endDrag());
    act(() => result.current.startSelection({ rowId: "r3", columnId: "c" }, { extend: true }));
    expect(result.current.selection).toEqual({ anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r3", columnId: "c" } });
  });

  it("moveSelection collapses to a single cell one step in the given direction", () => {
    const { result } = setup();
    act(() => result.current.startSelection({ rowId: "r2", columnId: "b" }));
    act(() => result.current.endDrag());

    act(() => result.current.moveSelection("down"));
    expect(result.current.selection).toEqual({ anchor: { rowId: "r3", columnId: "b" }, focus: { rowId: "r3", columnId: "b" } });

    act(() => result.current.moveSelection("left"));
    expect(result.current.selection).toEqual({ anchor: { rowId: "r3", columnId: "a" }, focus: { rowId: "r3", columnId: "a" } });
  });

  it("moveSelection clamps at grid bounds instead of wrapping or going out of range", () => {
    const { result } = setup();
    act(() => result.current.startSelection({ rowId: "r1", columnId: "a" }));
    act(() => result.current.endDrag());

    act(() => result.current.moveSelection("up"));
    act(() => result.current.moveSelection("left"));
    expect(result.current.selection).toEqual({ anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } });
  });

  it("moveSelection with extend keeps the anchor and moves only the focus, growing the range", () => {
    const { result } = setup();
    act(() => result.current.startSelection({ rowId: "r1", columnId: "a" }));
    act(() => result.current.endDrag());

    act(() => result.current.moveSelection("down", { extend: true }));
    expect(result.current.selection).toEqual({ anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r2", columnId: "a" } });

    act(() => result.current.moveSelection("right", { extend: true }));
    expect(result.current.selection).toEqual({ anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r2", columnId: "b" } });
  });

  it("calls onNavigateToRow only when the move actually changes row, not for a same-row horizontal move", () => {
    const onNavigateToRow = vi.fn();
    const { result } = setup(onNavigateToRow);
    act(() => result.current.startSelection({ rowId: "r1", columnId: "a" }));
    act(() => result.current.endDrag());

    act(() => result.current.moveSelection("right"));
    expect(onNavigateToRow).not.toHaveBeenCalled();

    act(() => result.current.moveSelection("down"));
    expect(onNavigateToRow).toHaveBeenCalledWith("r2");
    expect(onNavigateToRow).toHaveBeenCalledTimes(1);
  });

  it("moveSelection with no prior selection starts from the first row/column", () => {
    const { result } = setup();
    act(() => result.current.moveSelection("right"));
    expect(result.current.selection).toEqual({ anchor: { rowId: "r1", columnId: "b" }, focus: { rowId: "r1", columnId: "b" } });
  });

  it("setSelection directly replaces the selection", () => {
    const { result } = setup();
    act(() => result.current.setSelection({ anchor: { rowId: "r2", columnId: "a" }, focus: { rowId: "r3", columnId: "c" } }));
    expect(result.current.selection).toEqual({ anchor: { rowId: "r2", columnId: "a" }, focus: { rowId: "r3", columnId: "c" } });
  });

  it("clearSelection resets everything, including an in-progress drag", () => {
    const { result } = setup();
    act(() => result.current.startSelection({ rowId: "r1", columnId: "a" }));
    act(() => result.current.updateDrag({ rowId: "r2", columnId: "b" }));
    act(() => result.current.clearSelection());
    expect(result.current.selection).toBeUndefined();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.effectiveRange).toBeUndefined();
    // A drag in-flight before clearSelection must not resurrect a selection afterward.
    act(() => result.current.endDrag());
    expect(result.current.selection).toBeUndefined();
  });
});
