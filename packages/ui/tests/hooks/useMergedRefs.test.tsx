import { render, renderHook } from "@testing-library/react";
import { createRef, type Ref } from "react";
import { describe, expect, it, vi } from "vitest";
import { useMergedRefs } from "../../src/hooks/useMergedRefs";

describe("useMergedRefs", () => {
  it("assigns object and callback refs and clears them on unmount", () => {
    const object = createRef<HTMLDivElement>();
    const callback = vi.fn();
    function Box() {
      return <div data-testid="box" ref={useMergedRefs<HTMLDivElement>(object, callback, undefined, null)} />;
    }
    const { getByTestId, unmount } = render(<Box />);
    expect(object.current).toBe(getByTestId("box"));
    expect(callback).toHaveBeenCalledWith(getByTestId("box"));
    unmount();
    expect(object.current).toBeNull();
    expect(callback).toHaveBeenLastCalledWith(null);
  });

  it("keeps its identity until an input ref changes", () => {
    const a = createRef<HTMLElement>();
    const b = createRef<HTMLElement>();
    const { result, rerender } = renderHook(({ refs }: { refs: Ref<HTMLElement>[] }) => useMergedRefs(...refs), {
      initialProps: { refs: [a, b] },
    });
    const first = result.current;
    rerender({ refs: [a, b] });
    expect(result.current).toBe(first);
    rerender({ refs: [a, createRef<HTMLElement>()] });
    expect(result.current).not.toBe(first);
  });

  it("calls a returned cleanup instead of passing null", () => {
    const cleanup = vi.fn();
    const ref = vi.fn(() => cleanup);
    const { result } = renderHook(() => useMergedRefs<HTMLElement>(ref as unknown as Ref<HTMLElement>));
    const el = document.createElement("div");
    result.current(el);
    result.current(null);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(ref).toHaveBeenCalledTimes(1);
  });
});
