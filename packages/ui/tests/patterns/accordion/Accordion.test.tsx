import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../src/patterns/accordion/Accordion";

const tree = (props: Partial<React.ComponentProps<typeof Accordion>> = {}) => (
  <Accordion type="single" collapsible {...(props as object)}>
    <AccordionItem value="a">
      <AccordionTrigger>First</AccordionTrigger>
      <AccordionContent>
        <input aria-label="Note" defaultValue="kept" />
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="b">
      <AccordionTrigger>Second</AccordionTrigger>
      <AccordionContent>Two</AccordionContent>
    </AccordionItem>
  </Accordion>
);

describe("Accordion", () => {
  it("opens one panel at a time in single mode and keeps closed content mounted but inert", async () => {
    render(tree());
    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    const input = screen.getByDisplayValue("kept");
    const region = input.closest("[data-state]") as HTMLElement;
    expect(region).toHaveAttribute("data-state", "closed");
    expect(region).toHaveAttribute("inert");
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(region).not.toHaveAttribute("inert"));
    expect(region).not.toHaveAttribute("aria-hidden");
    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(region).toHaveAttribute("inert"));
  });

  it("allows several open in multiple mode", () => {
    render(
      <Accordion type="multiple" defaultValue={["a", "b"]}>
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
    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute("aria-expanded", "true");
  });

  it("moves focus between triggers with the arrow keys", async () => {
    const user = userEvent.setup();
    render(tree());
    screen.getByRole("button", { name: "First" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Second" })).toHaveFocus();
  });

  it("wraps each trigger in a heading and supports controlled value", () => {
    render(tree({ value: "b" } as never));
    expect(screen.getAllByRole("heading")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute("aria-expanded", "true");
  });
});
