import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DonutChart, KpiCard } from "../../../src/patterns/kpi-card/KpiCard";

describe("KpiCard", () => {
  it("renders the label and value in the default variant", () => {
    render(<KpiCard label="Revenue" value="42 kunden" />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("kunden")).toBeInTheDocument();
  });

  it("renders a dash when value is null", () => {
    render(<KpiCard label="Revenue" value={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows a skeleton instead of the value while loading", () => {
    render(<KpiCard label="Revenue" value="42" loading />);
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });

  it("renders the hero variant with a badge and progress bar", () => {
    render(
      <KpiCard
        label="Umsatz"
        value="1.2M"
        variant="hero"
        badge={{ text: "+12%", positive: true }}
        progress={72}
        progressLabel="72% of target"
      />,
    );
    expect(screen.getByText("1.2M")).toBeInTheDocument();
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText("72% of target")).toBeInTheDocument();
  });

  it("renders the mini variant with a linked icon", () => {
    const Icon = ({ className }: { className?: string }) => <svg className={className} data-testid="icon" />;
    render(<KpiCard label="Tasks" value="5" variant="mini" icon={Icon} href="/tasks" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/tasks");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("colors the mini variant's sub text by subTone", () => {
    render(<KpiCard label="Overdue" value="3" variant="mini" sub="2 days late" subTone="danger" />);
    expect(screen.getByText("2 days late")).toHaveClass("text-red-600");
  });

  it("renders a sparkline once given at least two data points", () => {
    const { container } = render(<KpiCard label="Trend" value="10" sparkline={[1, 2, 3]} />);
    expect(container.querySelector("polyline")).toBeInTheDocument();
  });

  it("renders the donut variant with a legend and percentage shares", () => {
    render(
      <KpiCard
        label="Pipeline"
        variant="donut"
        segments={[
          { label: "Won", value: 30 },
          { label: "Open", value: 10 },
        ]}
      />,
    );
    expect(screen.getByText("Won")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("shows a skeleton in the donut variant while loading", () => {
    const { container } = render(
      <KpiCard label="Pipeline" variant="donut" segments={[{ label: "Won", value: 1 }]} loading />,
    );
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(screen.queryByText("Won")).not.toBeInTheDocument();
  });
});

describe("DonutChart", () => {
  it("returns null when the total is zero", () => {
    const { container } = render(<DonutChart data={[{ label: "Empty", value: 0 }]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one circle per segment plus the track", () => {
    const { container } = render(
      <DonutChart data={[{ label: "A", value: 1 }, { label: "B", value: 1 }]} centerValue="2" centerLabel="total" />,
    );
    expect(container.querySelectorAll("circle")).toHaveLength(3);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("total")).toBeInTheDocument();
  });
});
