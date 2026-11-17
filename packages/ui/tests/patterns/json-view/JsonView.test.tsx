import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JsonView } from "../../../src/patterns/json-view/JsonView";

describe("JsonView", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  it("pretty-prints with key count and size", () => {
    render(<JsonView value={{ a: 1, b: [2] }} />);
    expect(screen.getByRole("region", { name: "JSON" })).toHaveTextContent('"a": 1');
    expect(screen.getByText(/2 keys · \d+ B/)).toBeInTheDocument();
  });

  it("counts array items and singular key", () => {
    const { rerender } = render(<JsonView value={[1, 2, 3]} />);
    expect(screen.getByText(/3 items/)).toBeInTheDocument();
    rerender(<JsonView value={{ a: 1 }} />);
    expect(screen.getByText(/1 key ·/)).toBeInTheDocument();
  });

  it("handles primitives, undefined and circular values", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const { rerender } = render(<JsonView value={undefined} />);
    expect(screen.getByRole("region")).toHaveTextContent("null");
    rerender(<JsonView value={circular} />);
    expect(screen.getByRole("region")).toHaveTextContent("[object Object]");
  });

  it("collapses and can start closed", () => {
    render(<JsonView value={{ a: 1 }} defaultOpen={false} label="Payload" />);
    const trigger = screen.getByRole("button", { name: /^Payload/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("copies the pretty text", async () => {
    render(<JsonView value={{ a: 1 }} label="Body" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Body" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('{\n  "a": 1\n}'));
  });
});
