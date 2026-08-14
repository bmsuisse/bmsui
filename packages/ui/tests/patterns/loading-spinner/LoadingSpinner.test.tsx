import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingOverlay, LoadingSpinner } from "../../../src/patterns/loading-spinner/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders the spinner icon", () => {
    const { container } = render(<LoadingSpinner />);
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("animate-spin");
  });

  it("renders the label text when given", () => {
    render(<LoadingSpinner label="Loading…" />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("omits label text when not given", () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector("span > span")).not.toBeInTheDocument();
  });

  it("applies visibly different size classes for sm, default and lg", () => {
    const { container: sm } = render(<LoadingSpinner size="sm" />);
    const { container: base } = render(<LoadingSpinner />);
    const { container: lg } = render(<LoadingSpinner size="lg" />);

    const smIcon = sm.querySelector("svg");
    const baseIcon = base.querySelector("svg");
    const lgIcon = lg.querySelector("svg");

    expect(smIcon).toHaveClass("h-3.5", "w-3.5");
    expect(baseIcon).toHaveClass("h-4", "w-4");
    expect(lgIcon).toHaveClass("h-6", "w-6");

    expect(smIcon?.className).not.toBe(baseIcon?.className);
    expect(baseIcon?.className).not.toBe(lgIcon?.className);
  });

  it("forwards a custom className onto the wrapper", () => {
    const { container } = render(<LoadingSpinner className="my-custom-class" />);
    expect(container.querySelector("span")).toHaveClass("my-custom-class");
  });
});

describe("LoadingOverlay", () => {
  it("renders a centered wrapper containing a spinner", () => {
    const { container } = render(<LoadingOverlay />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("flex", "items-center", "justify-center");
    expect(wrapper?.querySelector("svg")).toBeInTheDocument();
    expect(wrapper?.querySelector("svg")).toHaveClass("animate-spin");
  });

  it("forwards label to the inner spinner", () => {
    render(<LoadingOverlay label="Fetching data…" />);
    expect(screen.getByText("Fetching data…")).toBeInTheDocument();
  });

  it("defaults to the large spinner size", () => {
    const { container } = render(<LoadingOverlay />);
    expect(container.querySelector("svg")).toHaveClass("h-6", "w-6");
  });
});
