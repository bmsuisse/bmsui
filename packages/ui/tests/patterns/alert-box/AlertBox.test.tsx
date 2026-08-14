import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertBox } from "../../../src/patterns/alert-box/AlertBox";

describe("AlertBox", () => {
  it("always renders its children", () => {
    render(<AlertBox variant="info">Something happened</AlertBox>);
    expect(screen.getByText("Something happened")).toBeInTheDocument();
  });

  it("renders a title only when given", () => {
    const { rerender } = render(<AlertBox variant="info">Body</AlertBox>);
    expect(screen.queryByText("Heads up")).not.toBeInTheDocument();

    rerender(
      <AlertBox variant="info" title="Heads up">
        Body
      </AlertBox>,
    );
    expect(screen.getByText("Heads up")).toBeInTheDocument();
  });

  it.each([
    ["error", "destructive"],
    ["warning", "amber"],
    ["info", "sky"],
    ["success", "emerald"],
  ] as const)("applies its own distinguishing color class for variant=%s", (variant, fragment) => {
    const { container } = render(<AlertBox variant={variant}>Body</AlertBox>);
    expect(container.firstElementChild?.className).toContain(fragment);
  });

  it("renders a default icon", () => {
    const { container } = render(<AlertBox variant="error">Body</AlertBox>);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("replaces the default icon when a custom icon is given", () => {
    render(
      <AlertBox variant="error" icon={<span data-testid="custom-icon">*</span>}>
        Body
      </AlertBox>,
    );
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
    expect(document.querySelector("svg")).not.toBeInTheDocument();
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders no icon at all when icon is explicitly null", () => {
    const { container } = render(
      <AlertBox variant="error" icon={null}>
        Body
      </AlertBox>,
    );
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("merges a caller-provided className onto the container", () => {
    const { container } = render(
      <AlertBox variant="info" className="my-custom-class">
        Body
      </AlertBox>,
    );
    expect(container.firstElementChild?.className).toContain("my-custom-class");
  });
});
