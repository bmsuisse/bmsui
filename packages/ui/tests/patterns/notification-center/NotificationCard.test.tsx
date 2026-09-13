import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationCard } from "../../../src/patterns/notification-center/NotificationCard";

const NOW = new Date("2026-09-13T12:00:00.000Z");

describe("NotificationCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 'now' for a just-arrived notification", () => {
    render(<NotificationCard title="Job finished" timestamp={new Date(NOW.getTime() - 10_000)} />);
    expect(screen.getByText("now")).toBeInTheDocument();
  });

  it("renders minutes, hours, yesterday and a short date for older offsets", () => {
    const { rerender } = render(
      <NotificationCard title="A" timestamp={new Date(NOW.getTime() - 2 * 60_000)} />,
    );
    expect(screen.getByText("2 min ago")).toBeInTheDocument();

    rerender(<NotificationCard title="A" timestamp={new Date(NOW.getTime() - 3 * 3_600_000)} />);
    expect(screen.getByText("3 h ago")).toBeInTheDocument();

    rerender(<NotificationCard title="A" timestamp={new Date(NOW.getTime() - 26 * 3_600_000)} />);
    expect(screen.getByText("yesterday")).toBeInTheDocument();

    rerender(<NotificationCard title="A" timestamp={new Date(NOW.getTime() - 20 * 86_400_000)} />);
    expect(screen.getByText(/\w+ \d+/)).toBeInTheDocument();
  });

  it("accepts an ISO string timestamp", () => {
    render(<NotificationCard title="A" timestamp={NOW.toISOString()} />);
    expect(screen.getByText("now")).toBeInTheDocument();
  });

  it("shows the unread dot and semibold wash", () => {
    render(<NotificationCard title="Unread item" timestamp={NOW} unread />);
    const card = screen.getByText("Unread item").closest('[data-slot="notification-card"]');
    expect(card).toHaveClass("bg-primary/10");
    expect(card).toHaveAttribute("data-unread", "true");
  });

  it("has no unread styling by default", () => {
    render(<NotificationCard title="Read item" timestamp={NOW} />);
    const card = screen.getByText("Read item").closest('[data-slot="notification-card"]');
    expect(card).not.toHaveAttribute("data-unread");
  });

  it("renders an AiMarker for source='ai'", () => {
    render(<NotificationCard title="AI summary" timestamp={NOW} source="ai" />);
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("renders the actor's initials for source='person'", () => {
    render(<NotificationCard title="Approved" timestamp={NOW} source="person" actor={{ name: "Maria Keller" }} />);
    expect(screen.getByText("MK")).toBeInTheDocument();
  });

  it("renders an anchor when href is set", () => {
    render(<NotificationCard title="Go" timestamp={NOW} href="/inbox/1" />);
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/inbox/1");
  });

  it("renders a button when onSelect is set (no href)", () => {
    const onSelect = vi.fn();
    render(<NotificationCard title="Go" timestamp={NOW} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders neither a link nor a button when given neither href nor onSelect", () => {
    render(<NotificationCard title="Plain" timestamp={NOW} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("fires an action without also firing onSelect", () => {
    const onSelect = vi.fn();
    const onAction = vi.fn();
    render(
      <NotificationCard
        title="Approve request"
        timestamp={NOW}
        onSelect={onSelect}
        actions={[{ label: "Approve", onClick: onAction }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("fires onDismiss", () => {
    const onDismiss = vi.fn();
    render(<NotificationCard title="Banner" timestamp={NOW} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
