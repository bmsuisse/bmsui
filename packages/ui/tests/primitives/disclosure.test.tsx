import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../src/patterns/accordion/Accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../src/primitives/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../src/primitives/tabs";

// Radix's data-state / callback contract that apps' CSS and tests rely on, kept after the Base UI port.
describe("Radix-compatible disclosure state", () => {
  it("Tabs: data-state active|inactive, string onValueChange, nothing selected without a value", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Tabs onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b" forceMount>
          Content B
        </TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute("data-state", "inactive");
    expect(screen.queryByText("Content A")).toBeNull();
    // Radix leaves a force-mounted panel visible and usable; apps hide it with data-state CSS.
    expect(screen.getByText("Content B")).not.toHaveAttribute("hidden");
    expect(screen.getByText("Content B")).not.toHaveAttribute("inert");
    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Content B")).toHaveAttribute("data-state", "active");
    rerender(
      <Tabs value="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText("Content A")).toHaveAttribute("data-state", "active");
  });

  it("Collapsible: data-state on every part, force-mounted content is never hidden", () => {
    render(
      <Collapsible data-testid="root">
        <CollapsibleTrigger>More</CollapsibleTrigger>
        <CollapsibleContent forceMount>Text</CollapsibleContent>
      </Collapsible>,
    );
    const content = screen.getByText("Text");
    expect(content).toHaveAttribute("data-state", "closed");
    expect(content).not.toHaveAttribute("hidden");
    fireEvent.click(screen.getByText("More"));
    expect(screen.getByTestId("root")).toHaveAttribute("data-state", "open");
    expect(screen.getByText("More")).toHaveAttribute("data-state", "open");
    expect(content).toHaveAttribute("data-state", "open");
  });

  it("Accordion: single without collapsible keeps its open item open and reports strings", () => {
    const onValueChange = vi.fn();
    render(
      <Accordion type="single" defaultValue="a" onValueChange={onValueChange}>
        <AccordionItem value="a">
          <AccordionTrigger>First</AccordionTrigger>
          <AccordionContent>One</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Second</AccordionTrigger>
          <AccordionContent>Two</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const first = screen.getByRole("button", { name: "First" });
    expect(first).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(first).toHaveAttribute("data-state", "closed");
  });

  it("Tabs: the previous panel leaves at once and a force-mounted one stays visible, like Radix", () => {
    // jsdom has no getAnimations, so Base UI unmounts synchronously there; a browser waits a frame.
    const original = Object.getOwnPropertyDescriptor(Element.prototype, "getAnimations");
    Object.defineProperty(Element.prototype, "getAnimations", { value: () => [], configurable: true });
    try {
      const { unmount } = render(
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Content A</TabsContent>
          <TabsContent value="b">Content B</TabsContent>
          <TabsContent value="c" forceMount>
            Content C
          </TabsContent>
        </Tabs>,
      );
      fireEvent.click(screen.getByRole("tab", { name: "B" }));
      expect(screen.queryByText("Content A")).toBeNull();
      expect(screen.getByText("Content B")).not.toHaveAttribute("hidden");
      expect(screen.getByText("Content C")).toHaveAttribute("data-state", "inactive");
      expect(screen.getByText("Content C")).not.toHaveAttribute("hidden");
      unmount(); // before the stub goes: Base UI's queued frames call getAnimations
    } finally {
      if (original) Object.defineProperty(Element.prototype, "getAnimations", original);
      else delete (Element.prototype as { getAnimations?: unknown }).getAnimations;
    }
  });
});
