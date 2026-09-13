import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotificationBell } from "../../../src/patterns/notification-center/NotificationBell";

describe("NotificationBell", () => {
  it("hides the badge at 0", () => {
    render(<NotificationBell count={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("shows the badge at 3 and includes the count in the aria-label", () => {
    render(<NotificationBell count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument();
  });

  it("renders 99+ above 99", () => {
    render(<NotificationBell count={150} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("sets aria-expanded and pressed styling from `open`", () => {
    render(<NotificationBell count={1} open />);
    const button = screen.getByRole("button", { name: "Notifications, 1 unread" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveClass("text-primary");
  });

  it("forwards the ref", () => {
    let ref: HTMLButtonElement | null = null;
    render(
      <NotificationBell
        count={0}
        ref={(el) => {
          ref = el;
        }}
      />,
    );
    expect(ref).toBeInstanceOf(HTMLButtonElement);
  });
});
