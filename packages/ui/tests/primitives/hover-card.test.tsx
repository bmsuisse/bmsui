import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
