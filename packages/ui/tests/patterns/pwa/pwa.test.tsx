import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureInstallPrompt, resetInstallPrompt, useInstallPrompt } from "../../../src/hooks/useInstallPrompt";
import { useServiceWorkerUpdate } from "../../../src/hooks/useServiceWorkerUpdate";
import { BmsLocaleProvider } from "../../../src/i18n/locale";
import { InstallPrompt } from "../../../src/patterns/pwa/InstallPrompt";
import { OfflineIndicator } from "../../../src/patterns/pwa/OfflineIndicator";
import { UpdatePrompt } from "../../../src/patterns/pwa/UpdatePrompt";
import { Toaster } from "../../../src/patterns/toast/Toaster";
import { resetToasts } from "../../../src/patterns/toast/toastStore";

beforeEach(() => {
  window.localStorage.clear();
  resetToasts();
  resetInstallPrompt();
});
afterEach(() => vi.useRealTimers());

describe("useServiceWorkerUpdate", () => {
  it("is idle until a worker waits, then runs onUpdate once and falls back to a reload", async () => {
    vi.useFakeTimers();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const reload = vi.fn();
    const { result, rerender } = renderHook((p: { needRefresh: boolean }) => useServiceWorkerUpdate({ ...p, onUpdate, reload, reloadTimeoutMs: 1000 }), {
      initialProps: { needRefresh: false },
    });
    expect(result.current.status).toBe("idle");
    rerender({ needRefresh: true });
    expect(result.current.status).toBe("available");
    await act(async () => {
      result.current.update();
      result.current.update();
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("updating");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload when work became unsaved while the worker activated, nor after unmount", async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    let dirty = false;
    const { result, unmount } = renderHook(() =>
      useServiceWorkerUpdate({ needRefresh: true, onUpdate: () => Promise.resolve(), canReload: () => !dirty, reload, reloadTimeoutMs: 1000 }),
    );
    await act(async () => result.current.update());
    dirty = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(reload).not.toHaveBeenCalled();
    expect(result.current.status).toBe("blocked");

    dirty = false;
    let resolve = (): void => {};
    const late = renderHook(() =>
      useServiceWorkerUpdate({ needRefresh: true, onUpdate: () => new Promise<void>((r) => (resolve = r)), reload, reloadTimeoutMs: 1000 }),
    );
    await act(async () => late.result.current.update());
    late.unmount();
    await act(async () => {
      resolve();
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(reload).not.toHaveBeenCalled();
    unmount();
  });

  it("blocks while canReload is false and updates once it is true", async () => {
    const onUpdate = vi.fn();
    let dirty = true;
    const { result } = renderHook(() => useServiceWorkerUpdate({ needRefresh: true, onUpdate, canReload: () => !dirty }));
    act(() => result.current.update());
    expect(result.current.status).toBe("blocked");
    expect(onUpdate).not.toHaveBeenCalled();
    dirty = false;
    await act(async () => result.current.update());
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("snoozes and comes back, and recovers when onUpdate rejects", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useServiceWorkerUpdate({ needRefresh: true, onUpdate: () => Promise.reject(new Error("x")), snoozeMs: 5000 }));
    await act(async () => result.current.update());
    expect(result.current.status).toBe("available");
    act(() => result.current.snooze());
    expect(result.current.status).toBe("idle");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.status).toBe("available");
  });
});

describe("UpdatePrompt", () => {
  it("shows the bar with an update action and a Later button", () => {
    const onUpdate = vi.fn();
    render(<UpdatePrompt needRefresh onUpdate={onUpdate} data-testid="u" />);
    expect(screen.getByText("A new version is available.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByText("A new version is available.")).toBeNull();
  });

  it("runs onUpdate and shows the updating state", () => {
    const onUpdate = vi.fn(() => new Promise<void>(() => {}));
    render(<UpdatePrompt needRefresh onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onUpdate).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Updating…" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Later" })).toBeNull();
  });

  it("renders nothing visible without an update, and hides Later when not dismissible", () => {
    const { rerender } = render(<UpdatePrompt needRefresh={false} onUpdate={() => {}} />);
    expect(screen.queryByText("A new version is available.")).toBeNull();
    rerender(<UpdatePrompt needRefresh dismissible={false} onUpdate={() => {}} />);
    expect(screen.queryByRole("button", { name: "Later" })).toBeNull();
  });

  it("asks to save first when blocked, in the active locale", () => {
    render(
      <BmsLocaleProvider locale="de-CH">
        <UpdatePrompt needRefresh onUpdate={() => {}} canReload={() => false} />
      </BmsLocaleProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Neu laden" }));
    expect(screen.getByText("Speichere zuerst deine Änderungen und lade dann neu.")).toBeInTheDocument();
  });

  it("announces offline-ready once with a toast", () => {
    const shown = vi.fn();
    const { rerender } = render(
      <>
        <Toaster />
        <UpdatePrompt needRefresh={false} offlineReady onOfflineReadyShown={shown} onUpdate={() => {}} />
      </>,
    );
    expect(screen.getByText("Ready to work offline.")).toBeInTheDocument();
    rerender(
      <>
        <Toaster />
        <UpdatePrompt needRefresh={false} offlineReady onOfflineReadyShown={shown} onUpdate={() => {}} />
      </>,
    );
    expect(shown).toHaveBeenCalledTimes(1);
  });
});

describe("OfflineIndicator", () => {
  it("shows while offline and toasts when back online", () => {
    const { rerender } = render(
      <>
        <Toaster />
        <OfflineIndicator online={false} />
      </>,
    );
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    rerender(
      <>
        <Toaster />
        <OfflineIndicator online />
      </>,
    );
    expect(screen.queryByText(/You are offline/)).toBeNull();
    expect(screen.getByText("Back online.")).toBeInTheDocument();
  });

  it("does not toast on first render while online", () => {
    render(
      <>
        <Toaster />
        <OfflineIndicator online />
      </>,
    );
    expect(screen.queryByText("Back online.")).toBeNull();
  });
});

function fakeInstallEvent(outcome: "accepted" | "dismissed"): Event {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
}

describe("useInstallPrompt", () => {
  it("is none until the browser offers an install, then native; promptInstall reports the outcome", async () => {
    captureInstallPrompt();
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.platform).toBe("none");
    expect(result.current.canInstall).toBe(false);
    const event = fakeInstallEvent("accepted");
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.platform).toBe("native");
    expect(result.current.canInstall).toBe(true);
    let outcome = "";
    await act(async () => {
      outcome = await result.current.promptInstall();
    });
    expect(outcome).toBe("accepted");
    expect(await result.current.promptInstall()).toBe("unavailable");
  });

  it("marks installed on appinstalled and remembers Not now", () => {
    captureInstallPrompt();
    const { result } = renderHook(() => useInstallPrompt({ platform: "native" }));
    expect(result.current.canInstall).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.dismissed).toBe(true);
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(result.current.installed).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it("keeps capturing the browser event after one consumer unmounts", () => {
    const first = renderHook(() => useInstallPrompt());
    const second = renderHook(() => useInstallPrompt());
    first.unmount();
    act(() => {
      window.dispatchEvent(fakeInstallEvent("accepted"));
    });
    expect(second.result.current.platform).toBe("native");
  });

  it("forgets a snooze after snoozeDays", () => {
    window.localStorage.setItem("bmsui:pwa-install", String(Date.now() - 2 * 86_400_000));
    const { result } = renderHook(() => useInstallPrompt({ platform: "native", snoozeDays: 1 }));
    expect(result.current.dismissed).toBe(false);
  });
});

describe("InstallPrompt", () => {
  it("renders nothing where installing is impossible", () => {
    render(<InstallPrompt appName="OneSales" platform="none" />);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("shows a card with the app name and reports Not now", () => {
    const onDismiss = vi.fn();
    render(<InstallPrompt appName="OneSales" platform="native" onDismiss={onDismiss} />);
    expect(screen.getByRole("region", { name: "Install OneSales" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onDismiss).toHaveBeenCalled();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("calls the browser prompt and onInstalled when accepted", async () => {
    captureInstallPrompt();
    const onInstalled = vi.fn();
    render(<InstallPrompt appName="OneSales" onInstalled={onInstalled} />);
    act(() => {
      window.dispatchEvent(fakeInstallEvent("accepted"));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Install" }));
    });
    expect(onInstalled).toHaveBeenCalled();
  });

  it("opens the Add to Home Screen guide on iOS", () => {
    render(<InstallPrompt appName="OneSales" platform="ios" variant="banner" />);
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(screen.getByText("Install on iPhone or iPad")).toBeInTheDocument();
    expect(screen.getByText("Choose “Add to Home Screen”.")).toBeInTheDocument();
  });

  it("is controlled by open", () => {
    const { rerender } = render(<InstallPrompt appName="A" platform="native" open={false} />);
    expect(screen.queryByRole("region")).toBeNull();
    rerender(<InstallPrompt appName="A" platform="native" open />);
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("stays hidden inside the installed app even when open is forced", () => {
    captureInstallPrompt();
    render(<InstallPrompt appName="A" platform="ios" open />);
    expect(screen.getByRole("region")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.queryByRole("region")).toBeNull();
  });
});
