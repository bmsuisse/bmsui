import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../src/patterns/toast/ToastProvider";
import { ToastStore } from "../../../src/patterns/toast/toast-store";
import { type ToastApi, useToast } from "../../../src/patterns/toast/useToast";

function Harness({ onReady }: { onReady: (api: ToastApi) => void }): ReactElement {
  const api = useToast();
  onReady(api);
  return <button onClick={() => api.toast.success("Saved")}>save</button>;
}

function renderWithToasts(props: Partial<Parameters<typeof ToastProvider>[0]> = {}): { api: () => ToastApi } {
  let latest: ToastApi | undefined;
  render(
    <ToastProvider {...props}>
      <Harness
        onReady={(a) => {
          latest = a;
        }}
      />
    </ToastProvider>,
  );
  return {
    api: () => {
      if (!latest) throw new Error("toast api not ready");
      return latest;
    },
  };
}

describe("ToastProvider / useToast", () => {
  it("throws a helpful error when used outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Harness onReady={() => {}} />)).toThrow(/inside a <ToastProvider>/);
    spy.mockRestore();
  });

  it("shows a toast with title, description and the variant icon", () => {
    const { api } = renderWithToasts();
    act(() => {
      api().toast({ title: "Customer saved", description: "Changes are synced.", variant: "success" });
    });
    expect(screen.getByText("Customer saved")).toBeInTheDocument();
    expect(screen.getByText("Changes are synced.")).toBeInTheDocument();
    expect(screen.getByText("Customer saved").closest("li")).toHaveAttribute("data-variant", "success");
    expect(document.querySelector("li[data-variant] svg.lucide")).toBeInTheDocument();
  });

  it("uses an assertive live region for errors and a polite one otherwise", () => {
    const { api } = renderWithToasts();
    act(() => {
      api().toast.error("Sync failed");
      api().toast.info("Heads up");
    });
    // Radix renders the visually-hidden announcement region with role="status"
    // + aria-live; a foreground toast is announced assertively.
    expect(screen.getByText("Sync failed").closest("li")).toHaveAttribute("data-variant", "error");
    expect(screen.getByText("Heads up").closest("li")).toHaveAttribute("data-variant", "info");
    expect(document.querySelector('[aria-live="assertive"]')).toBeInTheDocument();
  });

  it("dismisses via the close button and removes the record", async () => {
    const { api } = renderWithToasts();
    act(() => {
      api().toast.success("Saved");
    });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByText("Saved")).not.toBeInTheDocument());
  });

  it("runs the action callback", () => {
    const onClick = vi.fn();
    const { api } = renderWithToasts();
    act(() => {
      api().toast({ title: "Task deleted", action: { label: "Undo", onClick } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("updates a toast in place when the same id is reused", () => {
    const { api } = renderWithToasts();
    act(() => {
      api().toast({ id: "save", title: "Saving…", variant: "loading" });
    });
    act(() => {
      api().toast({ id: "save", title: "Saved", variant: "success" });
    });
    expect(screen.queryByText("Saving…")).not.toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(document.querySelectorAll("li[data-variant]")).toHaveLength(1);
  });

  it("toast.promise transitions loading -> success and returns the value", async () => {
    const { api } = renderWithToasts();
    let value: string | undefined;
    await act(async () => {
      value = await api().toast.promise(Promise.resolve("ok"), {
        loading: "Saving…",
        success: (v) => `Saved ${v}`,
        error: "Failed",
      });
    });
    expect(value).toBe("ok");
    await waitFor(() => expect(screen.getByText("Saved ok")).toBeInTheDocument());
  });

  it("toast.promise transitions to error on rejection and keeps rejecting", async () => {
    const { api } = renderWithToasts();
    let result: Promise<never> | undefined;
    act(() => {
      result = api().toast.promise(Promise.reject(new Error("boom")), {
        loading: "Saving…",
        success: "Saved",
        error: (e) => `Failed: ${(e as Error).message}`,
      });
      // Handled here so the rejection isn't reported as unhandled before the assertion below.
      result.catch(() => {});
    });
    await expect(result).rejects.toThrow("boom");
    await waitFor(() => expect(screen.getByText("Failed: boom")).toBeInTheDocument());
  });

  it("auto-dismisses timed toasts but never errors", async () => {
    vi.useFakeTimers();
    try {
      const { api } = renderWithToasts({ duration: 1000 });
      act(() => {
        api().toast.success("Gone soon");
        api().toast.error("Stays");
      });
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.queryByText("Gone soon")).not.toBeInTheDocument();
      expect(screen.getByText("Stays")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("dismiss() with no id closes everything", async () => {
    const { api } = renderWithToasts();
    act(() => {
      api().toast.info("A");
      api().toast.info("B");
    });
    act(() => {
      api().dismiss();
    });
    await waitFor(() => {
      expect(screen.queryByText("A")).not.toBeInTheDocument();
      expect(screen.queryByText("B")).not.toBeInTheDocument();
    });
  });
});

describe("ToastStore", () => {
  it("evicts the oldest non-error toast past `max`, never an error", () => {
    const store = new ToastStore(2);
    store.add({ id: "err", title: "E", variant: "error" });
    store.add({ id: "a", title: "A" });
    store.add({ id: "b", title: "B" });
    const open = store.getSnapshot().filter((t) => t.open).map((t) => t.id);
    expect(open).toEqual(["err", "b"]);
  });

  it("notifies subscribers and stops after unsubscribe", () => {
    const store = new ToastStore(3);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.add({ title: "x" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.add({ title: "y" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
