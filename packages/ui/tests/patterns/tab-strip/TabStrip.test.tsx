import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeTabStripLayout, TabStrip, type TabStripTab } from "../../../src/patterns/tab-strip/TabStrip";

const TABS: TabStripTab[] = [
  { id: "overview", label: "Overview", content: <p>Overview content</p> },
  { id: "orders", label: "Orders", content: <p>Orders content</p> },
  { id: "invoices", label: "Invoices", content: <p>Invoices content</p> },
  { id: "notes", label: "Notes", content: <p>Notes content</p>, disabled: true },
];

function ControlledTabStrip({ initialValue, tabs = TABS }: { initialValue: string; tabs?: TabStripTab[] }) {
  const [value, setValue] = useState(initialValue);
  return <TabStrip tabs={tabs} value={value} onValueChange={setValue} data-testid="detail-tabs" />;
}

describe("computeTabStripLayout", () => {
  const order = ["a", "b", "c", "d"];
  const widths = new Map([
    ["a", 40],
    ["b", 40],
    ["c", 40],
    ["d", 40],
  ]);

  it("shows everything inline when the container hasn't been measured yet", () => {
    expect(computeTabStripLayout(order, widths, 0, 30, "a")).toEqual({ visibleIds: order, overflowIds: [] });
  });

  it("shows everything inline with no 'More' reserved when it all fits", () => {
    expect(computeTabStripLayout(order, widths, 200, 30, "a")).toEqual({ visibleIds: order, overflowIds: [] });
  });

  it("collapses tabs that don't fit into overflow, reserving space for the 'More' button", () => {
    // budget = 100 - 30 = 70; a(40) fits, a+b(80) doesn't -> only "a" inline
    expect(computeTabStripLayout(order, widths, 100, 30, "a")).toEqual({
      visibleIds: ["a"],
      overflowIds: ["b", "c", "d"],
    });
  });

  it("always keeps at least the first tab inline even if it alone exceeds the budget", () => {
    expect(computeTabStripLayout(order, widths, 10, 30, "a")).toEqual({
      visibleIds: ["a"],
      overflowIds: ["b", "c", "d"],
    });
  });

  it("swaps the active tab back inline when it would otherwise be overflowed", () => {
    // budget puts only "a" inline, but "c" is active -> "c" swaps in for "a"
    expect(computeTabStripLayout(order, widths, 100, 30, "c")).toEqual({
      visibleIds: ["c"],
      overflowIds: ["a", "b", "d"],
    });
  });

  it("preserves original tab order among the visible ids after a swap", () => {
    const wideWidths = new Map([
      ["a", 30],
      ["b", 30],
      ["c", 30],
      ["d", 30],
    ]);
    // budget = 150 - 20 = 130; a+b+c+d = 120 fits fully... use a tighter width instead
    const result = computeTabStripLayout(order, wideWidths, 90, 20, "d");
    // budget = 70; a+b(60) fits, +c(90) doesn't -> visible [a,b], "d" swaps in for "b"
    expect(result.overflowIds).toContain("b");
    expect(result.visibleIds).toEqual(["a", "d"]);
  });
});

describe("TabStrip", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders every tab inline and shows the active tab's content (unmeasured jsdom layout)", () => {
    render(<ControlledTabStrip initialValue="overview" />);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("tab", { name: "Orders" })).toBeInTheDocument();
    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.queryByText("Orders content")).not.toBeInTheDocument();
    expect(screen.queryByTestId("detail-tabs-more")).not.toBeInTheDocument();
  });

  it("switches the active tab and its content when a trigger is clicked", async () => {
    render(<ControlledTabStrip initialValue="overview" />);
    await userEvent.click(screen.getByRole("tab", { name: "Orders" }));
    expect(screen.getByRole("tab", { name: "Orders" })).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Orders content")).toBeInTheDocument();
  });

  it("does not activate a disabled tab", async () => {
    render(<ControlledTabStrip initialValue="overview" />);
    await userEvent.click(screen.getByRole("tab", { name: "Notes" }));
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("data-state", "active");
  });

  it("only renders the tabs the caller passes in — hiding one is entirely caller-driven", () => {
    render(<ControlledTabStrip initialValue="overview" tabs={TABS.filter((tab) => tab.id !== "invoices")} />);
    expect(screen.queryByRole("tab", { name: "Invoices" })).not.toBeInTheDocument();
  });

  it("collapses overflowing tabs into the 'More' menu and activates one from it", async () => {
    // Force a narrow container and wide tabs so only "Overview" fits inline, driving
    // the same measurement path the component uses in a real browser.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const measureId = this.getAttribute("data-tabstrip-measure");
      const isContainer = this.hasAttribute("data-tabstrip-container");
      const width = isContainer ? 120 : measureId === "__more__" ? 20 : 60;
      return { width, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });

    render(<ControlledTabStrip initialValue="overview" />);

    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Invoices" })).not.toBeInTheDocument();
    const moreButton = screen.getByTestId("detail-tabs-more");
    expect(moreButton).toHaveTextContent("More (3)");

    await userEvent.click(moreButton);
    const invoicesItem = await screen.findByTestId("detail-tabs-more-item-invoices");
    await userEvent.click(invoicesItem);
    expect(screen.getByText("Invoices content")).toBeInTheDocument();
  });
});
