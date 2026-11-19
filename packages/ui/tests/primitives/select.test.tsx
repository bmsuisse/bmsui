import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../src/primitives/select";

function Fruit(props: { value?: string; defaultValue?: string; onValueChange?: (value: string) => void }) {
  return (
    <Select {...props}>
      <SelectTrigger id="fruit" data-testid="trigger">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Apple</SelectItem>
        <SelectItem value="b">Banana</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("shows the selected item's text while closed, not its value", () => {
    render(<Fruit defaultValue="b" />);
    expect(screen.getByTestId("trigger")).toHaveTextContent("Banana");
    expect(screen.getByTestId("trigger")).toHaveAttribute("data-state", "closed");
    expect(screen.getByTestId("trigger")).toHaveAttribute("id", "fruit");
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("shows the placeholder and data-placeholder when empty", () => {
    render(<Fruit />);
    expect(screen.getByTestId("trigger")).toHaveTextContent("Pick one");
    expect(screen.getByTestId("trigger")).toHaveAttribute("data-placeholder");
  });

  it("opens, marks the checked item and reports the picked string value", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Fruit value="a" onValueChange={onValueChange} />);
    await user.click(screen.getByTestId("trigger"));
    const apple = await screen.findByRole("option", { name: "Apple" });
    expect(screen.getByTestId("trigger")).toHaveAttribute("data-state", "open");
    expect(apple).toHaveAttribute("data-state", "checked");
    expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute("data-state", "unchecked");
    await user.click(screen.getByRole("option", { name: "Banana" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });
});
