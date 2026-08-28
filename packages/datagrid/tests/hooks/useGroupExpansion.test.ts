import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGroupExpansion } from "../../src/hooks/useGroupExpansion";

describe("useGroupExpansion", () => {
  it("falls back to defaultGroupsExpanded for a group never toggled", () => {
    const { result } = renderHook(() => useGroupExpansion(true, undefined, undefined));
    expect(result.current.isGroupExpanded("Senior")).toBe(true);

    const { result: collapsedByDefault } = renderHook(() => useGroupExpansion(false, undefined, undefined));
    expect(collapsedByDefault.current.isGroupExpanded("Senior")).toBe(false);
  });

  it("toggleGroupExpanded flips just that group's own state, uncontrolled", () => {
    const { result } = renderHook(() => useGroupExpansion(true, undefined, undefined));
    act(() => result.current.toggleGroupExpanded("Senior"));
    expect(result.current.isGroupExpanded("Senior")).toBe(false);
    // Untouched groups keep falling back to the default.
    expect(result.current.isGroupExpanded("Junior")).toBe(true);

    act(() => result.current.toggleGroupExpanded("Senior"));
    expect(result.current.isGroupExpanded("Senior")).toBe(true);
  });

  it("is controlled when both expandedGroups and onExpandedGroupsChange are supplied", () => {
    const onExpandedGroupsChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ expandedGroups }) => useGroupExpansion(true, expandedGroups, onExpandedGroupsChange),
      { initialProps: { expandedGroups: { Senior: false } } },
    );
    expect(result.current.isGroupExpanded("Senior")).toBe(false);

    act(() => result.current.toggleGroupExpanded("Senior"));
    expect(onExpandedGroupsChange).toHaveBeenCalledWith({ Senior: true });
    // Controlled: internal state doesn't move on its own until the caller
    // feeds the new value back in as a prop.
    expect(result.current.isGroupExpanded("Senior")).toBe(false);

    rerender({ expandedGroups: { Senior: true } });
    expect(result.current.isGroupExpanded("Senior")).toBe(true);
  });

  it("isGroupExpanded/toggleGroupExpanded stay referentially stable across re-renders when nothing relevant changed", () => {
    const { result, rerender } = renderHook(() => useGroupExpansion(true, undefined, undefined));
    const firstIsExpanded = result.current.isGroupExpanded;
    const firstToggle = result.current.toggleGroupExpanded;
    rerender();
    expect(result.current.isGroupExpanded).toBe(firstIsExpanded);
    expect(result.current.toggleGroupExpanded).toBe(firstToggle);
  });
});
