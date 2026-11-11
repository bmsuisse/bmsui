import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../src/primitives/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../src/primitives/hover-card";

describe("HoverCard", () => {
  it("renders content when open, portaled with the popover surface", () => {
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger href="#">Anna</HoverCardTrigger>
        <HoverCardContent className="w-80">Anna Muster, Sales</HoverCardContent>
      </HoverCard>,
    );
    const card = screen.getByTestId("hover-card");
    expect(card).toHaveTextContent("Anna Muster, Sales");
    expect(card.className).toContain("bg-popover");
    expect(card.className).toContain("w-80");
  });

  it("opens on keyboard focus", async () => {
    render(
      <HoverCard openDelay={0}>
        <HoverCardTrigger href="#">Anna</HoverCardTrigger>
        <HoverCardContent>Details</HoverCardContent>
      </HoverCard>,
    );
    fireEvent.focus(screen.getByText("Anna"));
    expect(await screen.findByText("Details")).toBeInTheDocument();
  });
});

describe("HoverCard exit", () => {
  it("keeps the card mounted with data-exiting for the exit fade, then unmounts it", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(
        <HoverCard open>
          <HoverCardTrigger href="#">Anna</HoverCardTrigger>
          <HoverCardContent>Details</HoverCardContent>
        </HoverCard>,
      );
      expect(screen.getByTestId("hover-card")).not.toHaveAttribute("data-exiting");
      rerender(
        <HoverCard open={false}>
          <HoverCardTrigger href="#">Anna</HoverCardTrigger>
          <HoverCardContent>Details</HoverCardContent>
        </HoverCard>,
      );
      expect(screen.getByTestId("hover-card")).toHaveAttribute("data-exiting");
      act(() => vi.advanceTimersByTime(200));
      expect(screen.queryByTestId("hover-card")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes instantly when animated is false", () => {
    const { rerender } = render(
      <HoverCard open animated={false}>
        <HoverCardTrigger href="#">Anna</HoverCardTrigger>
        <HoverCardContent>Details</HoverCardContent>
      </HoverCard>,
    );
    rerender(
      <HoverCard open={false} animated={false}>
        <HoverCardTrigger href="#">Anna</HoverCardTrigger>
        <HoverCardContent>Details</HoverCardContent>
      </HoverCard>,
    );
    expect(screen.queryByTestId("hover-card")).toBeNull();
  });
});

describe("Collapsible", () => {
  it("shows and hides its content", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>More</CollapsibleTrigger>
        <CollapsibleContent>Hidden text</CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.queryByText("Hidden text")).toBeNull();
    fireEvent.click(screen.getByText("More"));
    expect(screen.getByText("Hidden text")).toBeInTheDocument();
  });
});
