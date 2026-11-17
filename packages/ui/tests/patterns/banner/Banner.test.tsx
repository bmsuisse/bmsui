import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useOnlineStatus } from "../../../src/hooks/useOnlineStatus";
import { Banner } from "../../../src/patterns/banner/Banner";

describe("Banner", () => {
  it("keeps the live region mounted while the content toggles", () => {
    const { rerender } = render(<Banner open={false} data-testid="b">Offline</Banner>);
    const region = screen.getByTestId("b");
    expect(region).toHaveAttribute("role", "status");
    expect(screen.queryByText("Offline")).toBeNull();
    rerender(<Banner open data-testid="b">Offline</Banner>);
    expect(screen.getByTestId("b")).toBe(region);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("renders actions and a dismiss button", () => {
    const onDismiss = vi.fn();
    render(<Banner tone="warning" actions={<button>Reload</button>} onDismiss={onDismiss} labels={{ dismiss: "Schliessen" }}>Update</Banner>);
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Schliessen" }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("supports role alert", () => {
    render(<Banner role="alert" tone="danger" data-testid="b">Expired</Banner>);
    expect(screen.getByTestId("b")).toHaveAttribute("role", "alert");
  });
});

describe("useOnlineStatus", () => {
  it("follows online/offline events", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    const spy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);
    spy.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
    spy.mockRestore();
  });
});
