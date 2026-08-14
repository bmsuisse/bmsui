import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { DateColumn } from "../../src/column/types";
import { DateRangeFilter } from "../../src/filter/DateRangeFilter";
import { ControlledFilter } from "./harness";

interface Row {
  createdAt: string;
}

const column: DateColumn<Row> = { id: "createdAt", type: "date", header: "Created" };
const TODAY = new Date("2024-03-15T12:00:00Z");

describe("DateRangeFilter", () => {
  it("shows an icon-only trigger with no visible text when unfiltered", () => {
    render(<DateRangeFilter column={column} value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Filter Created" })).toHaveTextContent("");
  });

  it("emits a between filter for the Today preset", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<DateColumn<Row>, { today: Date }>
        Widget={DateRangeFilter}
        column={column}
        onChangeSpy={onChangeSpy}
        extraProps={{ today: TODAY }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Created" }));
    await userEvent.click(await screen.findByRole("button", { name: "Today" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "createdAt",
      operator: "between",
      value: ["2024-03-15", "2024-03-15"],
    });
  });

  it("emits a between filter for the Last 7 days preset", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<DateColumn<Row>, { today: Date }>
        Widget={DateRangeFilter}
        column={column}
        onChangeSpy={onChangeSpy}
        extraProps={{ today: TODAY }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Created" }));
    await userEvent.click(await screen.findByRole("button", { name: "Last 7 days" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "createdAt",
      operator: "between",
      value: ["2024-03-09", "2024-03-15"],
    });
  });

  it("emits a between filter for the This month preset", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<DateColumn<Row>, { today: Date }>
        Widget={DateRangeFilter}
        column={column}
        onChangeSpy={onChangeSpy}
        extraProps={{ today: TODAY }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Created" }));
    await userEvent.click(await screen.findByRole("button", { name: "This month" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "createdAt",
      operator: "between",
      value: ["2024-03-01", "2024-03-31"],
    });
  });

  it("clears the filter when Custom is clicked", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<DateColumn<Row>, { today: Date }>
        Widget={DateRangeFilter}
        column={column}
        initial={{ field: "createdAt", operator: "between", value: ["2024-03-01", "2024-03-31"] }}
        onChangeSpy={onChangeSpy}
        extraProps={{ today: TODAY }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Created" }));
    await userEvent.click(await screen.findByRole("button", { name: "Custom" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith(undefined);
  });
});

describe("DateRangeFilter: date-only bounds round-trip through timezones behind UTC", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    // A bare "YYYY-MM-DD" string is parsed by the JS spec as UTC midnight;
    // re-displaying it with a plain `new Date(...)` would shift it back a
    // day in any timezone behind UTC. This TZ is unambiguously behind UTC
    // year-round, unlike the sandbox's own local TZ (CEST, ahead of UTC),
    // where the bug this guards against wouldn't be observable at all.
    process.env.TZ = "America/New_York";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("displays the same calendar day it was given, not the day before", () => {
    render(
      <DateRangeFilter
        column={column}
        value={{ field: "createdAt", operator: "between", value: ["2024-03-15", "2024-03-15"] }}
        onChange={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Filter Created" });
    expect(trigger).toHaveTextContent("Mar 15, 2024");
    expect(trigger).not.toHaveTextContent("Mar 14, 2024");
  });
});

describe("DateRangeFilter (bare — no own Popover/trigger, for a caller-provided popover)", () => {
  it("renders the presets and calendar directly, with no trigger button or Label to open", () => {
    render(<DateRangeFilter column={column} value={undefined} onChange={vi.fn()} bare />);
    expect(screen.queryByRole("button", { name: "Filter Created" })).not.toBeInTheDocument();
    expect(screen.queryByText("Created", { selector: "label" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
  });

  it("still emits a filter change from a preset with no popover to open first", async () => {
    const onChangeSpy = vi.fn();
    render(
      <DateRangeFilter column={column} value={undefined} onChange={onChangeSpy} today={TODAY} bare />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onChangeSpy).toHaveBeenCalledWith({
      field: "createdAt",
      operator: "between",
      value: ["2024-03-15", "2024-03-15"],
    });
  });
});
