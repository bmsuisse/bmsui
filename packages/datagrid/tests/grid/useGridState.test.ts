import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGridState } from "../../src/grid/useGridState";
import type { GridState } from "../../src/filter/types";

describe("useGridState (externalState / gridState push)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("seeds initial state from externalState when given from the first render, not from DEFAULT_STATE/initialState", () => {
    const seeded: GridState = { filter: null, sort: [{ field: "name", dir: "desc" }], page: 3, pageSize: 50 };
    const onStateChange = vi.fn();
    const { result } = renderHook(() =>
      useGridState({ mode: "server", data: [], rowCount: 0, onStateChange }, undefined, seeded),
    );
    // If the initial useState ignored externalState, this would be DEFAULT_STATE
    // (sort: [], page: 0, pageSize: 20) on the very first render instead.
    expect(result.current.state).toEqual(seeded);
  });

  it("cancels a pending debounced filter notify when a new externalState is pushed in, so the stale notify can't resurrect the old filter", () => {
    const onStateChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ externalState }: { externalState?: GridState }) =>
        useGridState({ mode: "server", data: [], rowCount: 0, onStateChange }, undefined, externalState),
      { initialProps: { externalState: undefined as GridState | undefined } },
    );

    // Type into a filter -- schedules a debounced onStateChange ~300ms out.
    act(() => {
      result.current.setColumnFilter("name", { field: "name", operator: "contains", value: "ali" });
    });
    expect(onStateChange).not.toHaveBeenCalled();

    // Before the debounce fires, the caller pushes a cleared state in (e.g. a
    // "clear all filters" button wired through gridState).
    const cleared: GridState = { filter: null, sort: [], page: 0, pageSize: 20 };
    rerender({ externalState: cleared });
    expect(result.current.state).toEqual(cleared);

    // Advance well past the 300ms debounce window. If the stale notify had
    // fired, onStateChange would have been called with the OLD ("ali")
    // filter, resurrecting it in a caller that mirrors onStateChange back
    // into the state it feeds as `gridState`.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onStateChange).not.toHaveBeenCalled();
    expect(result.current.state).toEqual(cleared);
  });
});
