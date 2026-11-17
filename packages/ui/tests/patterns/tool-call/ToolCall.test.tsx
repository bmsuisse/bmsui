import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolCallCard, ToolCallGroup, formatToolDuration } from "../../../src/patterns/tool-call/ToolCall";

describe("formatToolDuration", () => {
  it("formats ms, s and min", () => {
    expect(formatToolDuration(340)).toBe("340 ms");
    expect(formatToolDuration(1234)).toBe("1.2 s");
    expect(formatToolDuration(125000)).toBe("2 min 5 s");
  });
});

describe("ToolCallCard", () => {
  it("is folded when done and opens on click", () => {
    render(<ToolCallCard name="run_query" input={{ sql: "select 1" }} output="1 row" duration={1500} />);
    const trigger = screen.getByRole("button", { name: /run_query/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("1.5 s")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/select 1/)).toBeInTheDocument();
  });

  it("is open while running and folds when it finishes", () => {
    const { rerender } = render(<ToolCallCard name="t" status="running" input="x" />);
    expect(screen.getByRole("button", { name: /t/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("img", { name: "Running" })).toBeInTheDocument();
    rerender(<ToolCallCard name="t" status="done" input="x" />);
    expect(screen.getByRole("button", { name: /t/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the reader's choice across status changes", () => {
    const { rerender } = render(<ToolCallCard name="t" status="running" input="x" />);
    fireEvent.click(screen.getByRole("button", { name: /t/ }));
    rerender(<ToolCallCard name="t" status="done" input="x" />);
    expect(screen.getByRole("button", { name: /t/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on error and shows the message", () => {
    render(<ToolCallCard name="t" status="error" error="timeout" />);
    expect(screen.getByRole("alert")).toHaveTextContent("timeout");
    expect(screen.getByRole("img", { name: "Failed" })).toBeInTheDocument();
  });

  it("renders no button without detail", () => {
    render(<ToolCallCard name="t" summary="nothing to show" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("nothing to show")).toBeInTheDocument();
  });

  it("supports labels and controlled open", () => {
    render(<ToolCallCard name="t" status="pending" open input="x" labels={{ pending: "Wartet" }} />);
    expect(screen.getByRole("img", { name: "Wartet" })).toBeInTheDocument();
  });
});

describe("ToolCallGroup", () => {
  it("counts its steps and folds them", () => {
    render(
      <ToolCallGroup>
        <ToolCallCard name="a" />
        <ToolCallCard name="b" />
      </ToolCallGroup>,
    );
    const trigger = screen.getByRole("button", { name: "2 steps" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("is open while active", () => {
    render(
      <ToolCallGroup active count={1}>
        <ToolCallCard name="a" status="running" />
      </ToolCallGroup>,
    );
    expect(screen.getByRole("button", { name: /1 step/ })).toHaveAttribute("aria-expanded", "true");
  });
});
