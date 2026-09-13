import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Star } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SuggestionChips, type Suggestion } from "../../../src/patterns/chat/SuggestionChips";

const suggestions: Suggestion[] = [
  { id: "a", label: "Summarize this", description: "Get a quick recap", icon: Star },
  { id: "b", label: "Ask a follow-up" },
  { id: "c", label: "Disabled one", disabled: true },
];

describe("SuggestionChips", () => {
  describe.each(["list", "row", "wrap"] as const)("layout=%s", (layout) => {
    it("renders all suggestion labels", () => {
      render(<SuggestionChips suggestions={suggestions} layout={layout} />);
      expect(screen.getByRole("button", { name: /Summarize this/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ask a follow-up" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Disabled one" })).toBeInTheDocument();
    });
  });

  it("clicking a chip calls onPick with that suggestion", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<SuggestionChips suggestions={suggestions} onPick={onPick} />);
    await user.click(screen.getByRole("button", { name: "Ask a follow-up" }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(suggestions[1]);
  });

  it("disables a suggestion marked disabled and does not fire onPick", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<SuggestionChips suggestions={suggestions} onPick={onPick} />);
    const button = screen.getByRole("button", { name: "Disabled one" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("component-level disabled disables all chips", () => {
    render(<SuggestionChips suggestions={suggestions} disabled />);
    expect(screen.getByRole("button", { name: /Summarize this/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ask a follow-up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disabled one" })).toBeDisabled();
  });

  it("onDismiss renders a dismiss control per chip that calls back without firing onPick", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onDismiss = vi.fn();
    render(<SuggestionChips suggestions={suggestions} onPick={onPick} onDismiss={onDismiss} />);
    const dismiss = screen.getByRole("button", { name: "Dismiss Ask a follow-up" });
    await user.click(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith(suggestions[1]);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("renderChip output replaces the default chip", () => {
    render(
      <SuggestionChips
        suggestions={suggestions}
        renderChip={(s) => <div data-testid={`custom-${s.id}`}>Custom {s.label}</div>}
      />,
    );
    expect(screen.getByTestId("custom-a")).toHaveTextContent("Custom Summarize this");
    expect(screen.queryByRole("button", { name: /Summarize this/ })).not.toBeInTheDocument();
  });

  it("renders description and icon in layout=list", () => {
    const { container } = render(<SuggestionChips suggestions={suggestions} layout="list" />);
    expect(screen.getByText("Get a quick recap")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  describe("layout=row without ResizeObserver", () => {
    let original: typeof ResizeObserver | undefined;

    beforeEach(() => {
      original = globalThis.ResizeObserver;
      // @ts-expect-error -- simulate an environment without ResizeObserver (SSR/old jsdom)
      delete globalThis.ResizeObserver;
    });

    afterEach(() => {
      globalThis.ResizeObserver = original as typeof ResizeObserver;
    });

    it("does not throw and still renders", () => {
      expect(() => render(<SuggestionChips suggestions={suggestions} layout="row" />)).not.toThrow();
      expect(screen.getByRole("button", { name: "Ask a follow-up" })).toBeInTheDocument();
    });
  });

  it("forwards ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SuggestionChips ref={ref} suggestions={suggestions} className="custom-class" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("custom-class");
  });
});
