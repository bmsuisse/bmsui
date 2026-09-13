import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationCard } from "../../../src/patterns/notification-center/NotificationCard";
import { NotificationPanel } from "../../../src/patterns/notification-center/NotificationPanel";

const mockMatchMedia = (matches: boolean): void => {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches,
    media: "(min-width: 768px)",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList);
};

describe("NotificationPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when closed", () => {
    mockMatchMedia(true);
    render(
      <NotificationPanel open={false} onOpenChange={vi.fn()}>
        <NotificationCard title="Hidden" timestamp={new Date()} />
      </NotificationPanel>,
    );
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("renders the panel and its children when open", () => {
    mockMatchMedia(true);
    render(
      <NotificationPanel open onOpenChange={vi.fn()}>
        <NotificationCard title="Job finished" timestamp={new Date()} />
      </NotificationPanel>,
    );
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Job finished")).toBeInTheDocument();
  });

  it("renders EmptyState when there are no children", () => {
    mockMatchMedia(true);
    render(
      <NotificationPanel open onOpenChange={vi.fn()}>
        {null}
      </NotificationPanel>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
  });

  it("renders skeleton rows when loading", () => {
    mockMatchMedia(true);
    render(
      <NotificationPanel open onOpenChange={vi.fn()} loading>
        <NotificationCard title="Should not show" timestamp={new Date()} />
      </NotificationPanel>,
    );
    expect(screen.getByTestId("notification-panel-skeleton")).toBeInTheDocument();
  });

  it("renders an error state with a retry button", () => {
    mockMatchMedia(true);
    const onRetry = vi.fn();
    render(
      <NotificationPanel open onOpenChange={vi.fn()} error onRetry={onRetry}>
        <NotificationCard title="Should not show" timestamp={new Date()} />
      </NotificationPanel>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows 'Mark all read' only when onMarkAllRead is set and unreadCount > 0", () => {
    mockMatchMedia(true);
    const onMarkAllRead = vi.fn();
    const { rerender } = render(
      <NotificationPanel open onOpenChange={vi.fn()} unreadCount={0} onMarkAllRead={onMarkAllRead}>
        <NotificationCard title="A" timestamp={new Date()} />
      </NotificationPanel>,
    );
    expect(screen.queryByRole("button", { name: "Mark all read" })).not.toBeInTheDocument();

    rerender(
      <NotificationPanel open onOpenChange={vi.fn()} unreadCount={2} onMarkAllRead={onMarkAllRead}>
        <NotificationCard title="A" timestamp={new Date()} />
      </NotificationPanel>,
    );
    screen.getByRole("button", { name: "Mark all read" }).click();
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);

    rerender(
      <NotificationPanel open onOpenChange={vi.fn()} unreadCount={2}>
        <NotificationCard title="A" timestamp={new Date()} />
      </NotificationPanel>,
    );
    expect(screen.queryByRole("button", { name: "Mark all read" })).not.toBeInTheDocument();
  });

  it("renders as a bottom sheet on mobile", () => {
    mockMatchMedia(false);
    render(
      <NotificationPanel open onOpenChange={vi.fn()}>
        <NotificationCard title="Mobile row" timestamp={new Date()} />
      </NotificationPanel>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("rounded-t-2xl");
    expect(screen.getByText("Mobile row")).toBeInTheDocument();
  });
});
