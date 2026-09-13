import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  type NotificationBannerApi,
  NotificationBannerHost,
  useNotificationBanner,
} from "../../../src/patterns/notification-center/NotificationBanner";

function Harness({ onReady }: { onReady: (api: NotificationBannerApi) => void }): ReactElement {
  const api = useNotificationBanner();
  onReady(api);
  return <div />;
}

function renderWithHost(
  props: Partial<Parameters<typeof NotificationBannerHost>[0]> = {},
): { api: () => NotificationBannerApi } {
  let latest: NotificationBannerApi | undefined;
  render(
    <NotificationBannerHost {...props}>
      <Harness
        onReady={(a) => {
          latest = a;
        }}
      />
    </NotificationBannerHost>,
  );
  return {
    api: () => {
      if (!latest) throw new Error("banner api not ready");
      return latest;
    },
  };
}

describe("NotificationBannerHost / useNotificationBanner", () => {
  it("throws a helpful error when used outside a host", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Harness onReady={() => {}} />)).toThrow(/inside a <NotificationBannerHost>/);
    spy.mockRestore();
  });

  it("show() renders a NotificationCard with the given title", () => {
    const { api } = renderWithHost();
    act(() => {
      api().show({ title: "Approval required", timestamp: new Date() });
    });
    expect(screen.getByText("Approval required")).toBeInTheDocument();
  });

  it("source=\"ai\" still renders the AiMarker through NotificationCard", () => {
    const { api } = renderWithHost();
    act(() => {
      api().show({ title: "Draft ready", timestamp: new Date(), source: "ai" });
    });
    expect(screen.getByText("Draft ready")).toBeInTheDocument();
    // AiMarker's default label — the same assertion NotificationCard's own
    // tests use for source="ai" — proves the banner renders the real
    // NotificationCard rather than a re-implementation.
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("priority=\"high\" never auto-dismisses, priority=\"normal\" auto-dismisses after 8s", () => {
    vi.useFakeTimers();
    try {
      const { api } = renderWithHost({ max: 2 });
      act(() => {
        api().show({ id: "high-1", title: "High priority event", timestamp: new Date(), priority: "high" });
        api().show({ id: "normal-1", title: "Normal event", timestamp: new Date(), priority: "normal" });
      });
      act(() => {
        vi.advanceTimersByTime(8500);
      });
      expect(screen.queryByText("Normal event")).not.toBeInTheDocument();
      expect(screen.getByText("High priority event")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("dismisses via the × button", async () => {
    const { api } = renderWithHost();
    act(() => {
      api().show({ title: "Dismiss me", timestamp: new Date() });
    });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument());
  });

  it("max caps how many banners are visible", () => {
    const { api } = renderWithHost({ max: 1 });
    act(() => {
      api().show({ id: "a", title: "First", timestamp: new Date() });
      api().show({ id: "b", title: "Second", timestamp: new Date() });
    });
    expect(screen.queryByText("First")).not.toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("gives the viewport its own distinct label and disables the F8 hotkey", () => {
    renderWithHost({ label: "Notification arrivals" });
    const region = screen.getByRole("region", { name: "Notification arrivals" });
    expect(region).toBeInTheDocument();
    expect(region).not.toHaveAttribute("aria-label", expect.stringContaining("F8"));

    const ol = document.querySelector("ol");
    fireEvent.keyDown(window, { key: "F8", code: "F8" });
    // hotkey={[]} means the banner viewport never claims focus for F8 — it
    // must remain reachable only through the (separate) toast viewport.
    expect(document.activeElement).not.toBe(ol);
  });

  it("uses foreground type (assertive live region) for high priority, background (polite) for normal", () => {
    const { api } = renderWithHost({ max: 2 });
    act(() => {
      api().show({ id: "high-1", title: "High event", timestamp: new Date(), priority: "high" });
      api().show({ id: "normal-1", title: "Normal event", timestamp: new Date(), priority: "normal" });
    });
    const highRoot = screen.getByText("High event").closest("li");
    const normalRoot = screen.getByText("Normal event").closest("li");
    expect(highRoot).toHaveAttribute("data-priority", "high");
    expect(normalRoot).toHaveAttribute("data-priority", "normal");
    // Radix's announce region mirrors `type` as the live region's
    // politeness: "foreground" -> assertive, "background" -> polite.
    expect(document.querySelector('[aria-live="assertive"]')).toBeInTheDocument();
    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });
});
