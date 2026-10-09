import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingState, useDelayedFlag } from "../../../src/patterns/loading-spinner/LoadingState";

describe("useDelayedFlag", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("only turns on after the delay and resets when inactive", () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 150), { initialProps: { active: true } });
    expect(result.current).toBe(false);
    act(() => void vi.advanceTimersByTime(150));
    expect(result.current).toBe(true);
    rerender({ active: false });
    expect(result.current).toBe(false);
    rerender({ active: true });
    expect(result.current).toBe(false);
  });

  it("delayMs=0 is immediate", () => {
    const { result } = renderHook(() => useDelayedFlag(true, 0));
    expect(result.current).toBe(true);
  });
});

describe("LoadingState", () => {
  it("announces the label to screen readers", () => {
    render(<LoadingState delayMs={0} label="Loading customers" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading customers");
  });
});
