import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFileDropzone } from "../../src/lib/useFileDropzone";

function dragEvent(): { preventDefault: () => void; dataTransfer: { files: File[] } } {
  return { preventDefault: () => {}, dataTransfer: { files: [] } };
}

describe("useFileDropzone", () => {
  it("turns dragging on for a single enter and stays on through nested leaves", () => {
    const { result } = renderHook(() => useFileDropzone(vi.fn()));

    act(() => result.current.handlers.onDragEnter(dragEvent() as never));
    act(() => result.current.handlers.onDragEnter(dragEvent() as never)); // entering a nested child
    expect(result.current.dragging).toBe(true);

    act(() => result.current.handlers.onDragLeave(dragEvent() as never)); // leaving the child
    expect(result.current.dragging).toBe(true); // still over the outer zone

    act(() => result.current.handlers.onDragLeave(dragEvent() as never)); // leaving the outer zone
    expect(result.current.dragging).toBe(false);
  });

  it("calls onFiles with the dropped files and clears dragging", () => {
    const onFiles = vi.fn();
    const { result } = renderHook(() => useFileDropzone(onFiles));
    const file = new File(["hi"], "note.txt");

    act(() => result.current.handlers.onDragEnter(dragEvent() as never));
    act(() =>
      result.current.handlers.onDrop({ preventDefault: () => {}, dataTransfer: { files: [file] } } as never),
    );

    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(result.current.dragging).toBe(false);
  });

  it("does not call onFiles when the drop carries none", () => {
    const onFiles = vi.fn();
    const { result } = renderHook(() => useFileDropzone(onFiles));

    act(() => result.current.handlers.onDrop(dragEvent() as never));

    expect(onFiles).not.toHaveBeenCalled();
  });
});
