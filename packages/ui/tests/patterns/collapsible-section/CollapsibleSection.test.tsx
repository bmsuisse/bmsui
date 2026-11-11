import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollapsibleSection } from "../../../src/patterns/collapsible-section/CollapsibleSection";

describe("CollapsibleSection", () => {
  it("is open by default, toggles, and keeps content mounted but inert when closed", () => {
    render(
      <CollapsibleSection title="Attachments" count={3}>
        <input aria-label="Note" defaultValue="kept" />
      </CollapsibleSection>,
    );
    const trigger = screen.getByTestId("collapsible-section-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("collapsible-section-count")).toHaveTextContent("3");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    const input = screen.getByDisplayValue("kept");
    const region = input.closest("[data-state]") as HTMLElement;
    expect(region).toHaveAttribute("data-state", "closed");
    expect(region).toHaveAttribute("inert");
    fireEvent.click(trigger);
    expect(region).not.toHaveAttribute("inert");
  });

  it("supports controlled use and keeps actions outside the toggle", () => {
    const onOpenChange = vi.fn();
    const onAdd = vi.fn();
    render(
      <CollapsibleSection
        title="Contacts"
        open={false}
        onOpenChange={onOpenChange}
        actions={<button type="button" onClick={onAdd}>Add</button>}
        data-testid="contacts"
      >
        body
      </CollapsibleSection>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("contacts-trigger"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("contacts-trigger")).toHaveAttribute("aria-expanded", "false");
  });

  it("starts closed with defaultOpen={false}", () => {
    render(
      <CollapsibleSection title="History" defaultOpen={false}>
        x
      </CollapsibleSection>,
    );
    expect(screen.getByTestId("collapsible-section-trigger")).toHaveAttribute("aria-expanded", "false");
  });
});
