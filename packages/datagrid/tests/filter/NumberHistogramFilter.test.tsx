import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { NumberColumn } from "../../src/column/types";
import { NumberHistogramFilter } from "../../src/filter/NumberHistogramFilter";
import { ControlledFilter } from "./harness";

interface Row {
  sales: number;
}

const column: NumberColumn<Row> = { id: "sales", type: "number", header: "Sales" };
const fullRange = [100, 200, 300, 400, 500];

async function openPopover(): Promise<void> {
  await userEvent.click(screen.getByRole("button"));
}

describe("NumberHistogramFilter: bare defaults to true (no own Popover/trigger)", () => {
  it("renders the histogram/min/max content directly when bare is unset — no trigger button to open first", () => {
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[] }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: fullRange }}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Sales minimum")).toHaveValue("100");
    expect(screen.getByLabelText("Sales maximum")).toHaveValue("500");
  });

  it("still emits filter changes from the min/max inputs with no popover to open first", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[] }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: fullRange }}
        onChangeSpy={onChangeSpy}
      />,
    );
    await userEvent.clear(screen.getByLabelText("Sales minimum"));
    await userEvent.type(screen.getByLabelText("Sales minimum"), "150");
    expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "sales", operator: "gte", value: 150 });
  });

  it("calls loadValues immediately on mount, with no open click needed", async () => {
    const loadValues = vi.fn().mockResolvedValue(fullRange);
    render(
      <ControlledFilter<NumberColumn<Row>, { loadValues: () => Promise<(number | null | undefined)[]> }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ loadValues }}
      />,
    );
    expect(loadValues).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("Sales minimum")).toHaveValue("100");
  });
});

describe("NumberHistogramFilter: bare={false} (own Popover/trigger — for filterDisplay: 'row')", () => {
  it("shows an icon-only trigger with no visible text on the closed trigger when unfiltered", () => {
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[]; buckets?: number; bare: boolean }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: fullRange, bare: false }}
      />,
    );
    expect(screen.getByRole("button", { name: "Filter Sales" })).toHaveTextContent("");
  });

  it("opens to show the min/max inputs seeded from the full data domain", async () => {
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[]; buckets?: number; bare: boolean }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: fullRange, bare: false }}
      />,
    );
    await openPopover();
    expect(screen.getByLabelText("Sales minimum")).toHaveValue("100");
    expect(screen.getByLabelText("Sales maximum")).toHaveValue("500");
  });

  it("emits gte when only the min input is changed", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[]; buckets?: number; bare: boolean }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: fullRange, bare: false }}
        onChangeSpy={onChangeSpy}
      />,
    );
    await openPopover();
    await userEvent.clear(screen.getByLabelText("Sales minimum"));
    await userEvent.type(screen.getByLabelText("Sales minimum"), "150");
    expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "sales", operator: "gte", value: 150 });
  });

  it("emits between when both min and max move off the data edges", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[]; buckets?: number; bare: boolean }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: fullRange, bare: false }}
        onChangeSpy={onChangeSpy}
      />,
    );
    await openPopover();
    await userEvent.clear(screen.getByLabelText("Sales minimum"));
    await userEvent.type(screen.getByLabelText("Sales minimum"), "150");
    await userEvent.clear(screen.getByLabelText("Sales maximum"));
    await userEvent.type(screen.getByLabelText("Sales maximum"), "450");
    expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "sales", operator: "between", value: [150, 450] });
  });

  it("shows a Clear button only when a filter is active, and it clears the filter", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[]; buckets?: number; bare: boolean }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: fullRange, bare: false }}
        initial={{ field: "sales", operator: "gte", value: 150 }}
        onChangeSpy={onChangeSpy}
      />,
    );
    await openPopover();
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChangeSpy).toHaveBeenLastCalledWith(undefined);
  });

  it("does not render a Clear button when unfiltered", async () => {
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[]; buckets?: number; bare: boolean }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: fullRange, bare: false }}
      />,
    );
    await openPopover();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("REGRESSION: the slider/histogram domain always spans the full allValues range, never just the active filter's bounds", async () => {
    // This is the bug this component exists to fix: an earlier design (see
    // facetedValues.ts's module doc) derived the domain from data already
    // narrowed by this same filter, so once a filter was set the domain
    // shrank to match it and could never be widened back out. Here, even
    // with an active [150, 200] filter, the two range <input>s' own
    // min/max attributes (which bound how far the thumb can move) must
    // still reflect the full [100, 500] allValues domain, not [150, 200].
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[]; buckets?: number; bare: boolean }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: fullRange, bare: false }}
        initial={{ field: "sales", operator: "between", value: [150, 200] }}
      />,
    );
    await openPopover();

    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(2);
    const [minSlider, maxSlider] = sliders as [HTMLInputElement, HTMLInputElement];
    // Both thumbs share the same track bounds, computed from allValues (100..500) --
    // if the bug were present, these would instead reflect [150, 200].
    expect(minSlider.min).toBe(maxSlider.min);
    expect(minSlider.max).toBe(maxSlider.max);
    const trackMin = Number(minSlider.min);
    const trackMax = Number(minSlider.max);
    // log10(100+1) .. log10(500+1), not log10(150+1) .. log10(200+1).
    expect(trackMin).toBeCloseTo(Math.log10(101), 3);
    expect(trackMax).toBeCloseTo(Math.log10(501), 3);
  });

  it("renders one histogram bar per bucket", async () => {
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[]; buckets?: number; bare: boolean }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: fullRange, buckets: 4, bare: false }}
      />,
    );
    await openPopover();
    const histogram = screen.getByTestId("filter-sales-histogram");
    expect(histogram.children).toHaveLength(4);
  });

  it("treats null/undefined entries in allValues as gaps, not as zero", async () => {
    render(
      <ControlledFilter<NumberColumn<Row>, { allValues: (number | null | undefined)[]; buckets?: number; bare: boolean }>
        Widget={NumberHistogramFilter}
        column={column}
        extraProps={{ allValues: [100, null, undefined, 500], bare: false }}
      />,
    );
    await openPopover();
    expect(screen.getByLabelText("Sales minimum")).toHaveValue("100");
    expect(screen.getByLabelText("Sales maximum")).toHaveValue("500");
  });

  describe("loadValues (server-mode facet fetching)", () => {
    it("calls loadValues when opened and seeds the domain from its resolved result", async () => {
      const loadValues = vi.fn().mockResolvedValue(fullRange);
      render(
        <ControlledFilter<
          NumberColumn<Row>,
          { loadValues: () => Promise<(number | null | undefined)[]>; buckets?: number; bare: boolean }
        >
          Widget={NumberHistogramFilter}
          column={column}
          extraProps={{ loadValues, bare: false }}
        />,
      );
      expect(loadValues).not.toHaveBeenCalled();
      await openPopover();
      expect(loadValues).toHaveBeenCalledTimes(1);
      expect(await screen.findByLabelText("Sales minimum")).toHaveValue("100");
      expect(screen.getByLabelText("Sales maximum")).toHaveValue("500");
    });

    it("shows a loading indicator while the fetch is pending, then removes it", async () => {
      let resolve!: (values: (number | null | undefined)[]) => void;
      const loadValues = vi.fn(
        () => new Promise<(number | null | undefined)[]>((r) => { resolve = r; }),
      );
      render(
        <ControlledFilter<
          NumberColumn<Row>,
          { loadValues: () => Promise<(number | null | undefined)[]>; buckets?: number; bare: boolean }
        >
          Widget={NumberHistogramFilter}
          column={column}
          extraProps={{ loadValues, bare: false }}
        />,
      );
      await openPopover();
      expect(screen.getByTestId("filter-sales-loading")).toBeInTheDocument();
      resolve(fullRange);
      await waitFor(() => expect(screen.queryByTestId("filter-sales-loading")).not.toBeInTheDocument());
    });

    it("re-fetches on every open, not just the first", async () => {
      const loadValues = vi.fn().mockResolvedValue(fullRange);
      render(
        <ControlledFilter<
          NumberColumn<Row>,
          { loadValues: () => Promise<(number | null | undefined)[]>; buckets?: number; bare: boolean }
        >
          Widget={NumberHistogramFilter}
          column={column}
          extraProps={{ loadValues, bare: false }}
        />,
      );
      await openPopover();
      await screen.findByLabelText("Sales minimum");
      // Close (click the trigger again) then reopen.
      await openPopover();
      await openPopover();
      expect(loadValues).toHaveBeenCalledTimes(2);
    });
  });
});
