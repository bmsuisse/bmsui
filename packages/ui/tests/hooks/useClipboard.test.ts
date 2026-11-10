import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useClipboard } from "../../src/hooks/useClipboard";

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

describe("useClipboard", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });

  it("copies, flags copied, and resets after the timeout", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    mockClipboard(writeText);
    const { result } = renderHook(() => useClipboard({ timeout: 1000 }));

    let ok = false;
    await act(async () => {
      ok = await result.current.copy("hello");
    });
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(result.current.copied).toBe(true);

    act(() => vi.advanceTimersByTime(600));
    await act(async () => {
      await result.current.copy("again");
    });
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.copied).toBe(true); // timer restarted by the second copy
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.copied).toBe(false);
  });

  it("exposes the error when the write fails", async () => {
    mockClipboard(() => Promise.reject(new Error("denied")));
    const { result } = renderHook(() => useClipboard());
    let ok = true;
    await act(async () => {
      ok = await result.current.copy("x");
    });
    expect(ok).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.error?.message).toBe("denied");
    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
  });

  it("falls back to execCommand when navigator.clipboard is missing", async () => {
    const exec = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true });
    const { result } = renderHook(() => useClipboard());
    await act(async () => {
      await result.current.copy("legacy");
    });
    expect(exec).toHaveBeenCalledWith("copy");
    expect(result.current.copied).toBe(true);
    expect(document.querySelector("textarea")).toBeNull();

    exec.mockReturnValue(false);
    await act(async () => {
      await result.current.copy("legacy");
    });
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
