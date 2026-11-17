import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Timeline, TimelineGroup, TimelineItem } from "../../../src/patterns/timeline/Timeline";

describe("Timeline", () => {
  it("renders an ordered list with aria-current on the active step only", () => {
    render(
      <Timeline aria-label="Progress">
        <TimelineItem status="done" title="Read" />
        <TimelineItem status="active" title="Match" />
        <TimelineItem status="pending" title="Check" />
      </Timeline>,
    );
    const list = screen.getByRole("list", { name: "Progress" });
    expect(list.tagName).toBe("OL");
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("aria-current"))).toEqual([null, "step", null]);
  });

  it("renders dates through Timestamp and other nodes as given", () => {
    render(
      <Timeline timeFormat="date">
        <TimelineItem title="A" time="2026-11-10T08:15:00Z" />
        <TimelineItem title="B" time="Yesterday" />
      </Timeline>,
    );
    expect(document.querySelectorAll("time")).toHaveLength(1);
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  it("shows a pending loader row as a status", () => {
    render(
      <Timeline pending labels={{ pending: "Warten…" }}>
        <TimelineItem title="A" />
      </Timeline>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Warten…");
  });

  it("labels a group's list with its header", () => {
    render(
      <Timeline>
        <TimelineGroup label="Today">
          <TimelineItem title="A" />
        </TimelineGroup>
      </Timeline>,
    );
    expect(screen.getByRole("list", { name: "Today" })).toBeInTheDocument();
  });

  it("folds the detail, keeps it mounted but inert, and calls onOpenChange", () => {
    const onOpenChange = vi.fn();
    render(
      <Timeline>
        <TimelineItem status="done" title="Step" collapsible onOpenChange={onOpenChange}>
          <span>payload</span>
        </TimelineItem>
      </Timeline>,
    );
    const toggle = screen.getByRole("button", { name: "Step" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const region = screen.getByText("payload").closest("[data-state]") as HTMLElement;
    expect(region).toHaveAttribute("inert");
    fireEvent.click(toggle);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(region).not.toHaveAttribute("inert");
  });

  it("follows the status until the user toggles", () => {
    const { rerender } = render(
      <Timeline>
        <TimelineItem status="active" title="Step" collapsible>
          detail
        </TimelineItem>
      </Timeline>,
    );
    const toggle = screen.getByRole("button", { name: "Step" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    rerender(
      <Timeline>
        <TimelineItem status="done" title="Step" collapsible>
          detail
        </TimelineItem>
      </Timeline>,
    );
    expect(screen.getByRole("button", { name: "Step" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    rerender(
      <Timeline>
        <TimelineItem status="error" title="Step" collapsible>
          detail
        </TimelineItem>
      </Timeline>,
    );
    // The user opened it; a later status change does not override that.
    expect(screen.getByRole("button", { name: "Step" })).toHaveAttribute("aria-expanded", "true");
  });

  it("always shows the detail of a non-collapsible item", () => {
    render(
      <Timeline>
        <TimelineItem title="Step">visible</TimelineItem>
      </Timeline>,
    );
    expect(screen.getByText("visible")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
