import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ButtonGroup } from "../../../src/patterns/button-group/ButtonGroup";

const OPTIONS = [
  { value: "ignore", label: "Ignore" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
] as const;

describe("ButtonGroup", () => {
  it("renders one button per option and marks the selected one aria-pressed", () => {
    render(<ButtonGroup options={[...OPTIONS]} value="create" onValueChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Ignore" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Create" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Update" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onValueChange with the clicked option's value", () => {
    const onValueChange = vi.fn();
    render(<ButtonGroup options={[...OPTIONS]} value="create" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(onValueChange).toHaveBeenCalledWith("update");
  });

  it("disables every segment when disabled is set", () => {
    render(<ButtonGroup options={[...OPTIONS]} value="create" onValueChange={() => {}} disabled />);
    for (const name of ["Ignore", "Create", "Update"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });

  it("rounds only the first and last segment", () => {
    render(<ButtonGroup options={[...OPTIONS]} value="create" onValueChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Ignore" }).className).toContain("rounded-l-md");
    expect(screen.getByRole("button", { name: "Update" }).className).toContain("rounded-r-md");
    expect(screen.getByRole("button", { name: "Create" }).className).not.toContain("rounded-l-md");
    expect(screen.getByRole("button", { name: "Create" }).className).not.toContain("rounded-r-md");
  });
});
