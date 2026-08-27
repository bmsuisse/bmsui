import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TagCombobox, type TagComboboxOption } from "../../../src/patterns/tag-combobox/TagCombobox";

const OPTIONS: TagComboboxOption[] = [
  { value: "ch", label: "Switzerland" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "us", label: "United States", disabled: true },
];

function ControlledTagCombobox({
  initialValue,
  options = OPTIONS,
  onSearchChange,
}: {
  initialValue: string[];
  options?: TagComboboxOption[];
  onSearchChange?: (search: string) => void;
}) {
  const [value, setValue] = useState<string[]>(initialValue);
  return <TagCombobox options={options} value={value} onChange={setValue} onSearchChange={onSearchChange} />;
}

describe("TagCombobox", () => {
  it("shows the placeholder when nothing is selected, and a chip per selected value otherwise", () => {
    render(<TagCombobox options={OPTIONS} value={["de", "fr"]} onChange={vi.fn()} placeholder="Add countries" />);
    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Add countries")).not.toBeInTheDocument();
  });

  it("opens the popover and lists all options with no search term", async () => {
    render(<TagCombobox options={OPTIONS} value={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "Switzerland" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Germany" })).toBeInTheDocument();
  });

  it("filters the visible options as the user types (client-side mode)", async () => {
    render(<TagCombobox options={OPTIONS} value={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = screen.getByRole("combobox").querySelector("input")!;
    await userEvent.type(search, "ger");
    expect(screen.getByRole("option", { name: "Germany" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "France" })).not.toBeInTheDocument();
  });

  it("calls onSearchChange on every keystroke and does not filter options itself in server-driven mode", async () => {
    const onSearchChange = vi.fn();
    // Server-driven mode: `options` is the caller's current result set, rendered as-is.
    render(<ControlledTagCombobox initialValue={[]} options={[OPTIONS[1]!]} onSearchChange={onSearchChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = screen.getByRole("combobox").querySelector("input")!;
    await userEvent.type(search, "sika");
    expect(onSearchChange).toHaveBeenLastCalledWith("sika");
    // Only the caller-provided result is shown, even though "sika" matches nothing in it by label —
    // proves this component isn't re-filtering the server's own result set.
    expect(screen.getByRole("option", { name: "Germany" })).toBeInTheDocument();
  });

  it("adds a chip on option click, keeps the popover open, and clears the search term", async () => {
    render(<ControlledTagCombobox initialValue={[]} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "France" }));
    // "France" now also shows as a (checked) option row in the still-open
    // popover, so the chip is what's uniquely identified via its remove button.
    expect(screen.getByRole("button", { name: "Remove France" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Switzerland" })).toBeInTheDocument();
  });

  it("does not select a disabled option", async () => {
    render(<ControlledTagCombobox initialValue={[]} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "United States" }));
    expect(screen.queryByRole("button", { name: "Remove United States" })).not.toBeInTheDocument();
  });

  it("removes a chip via its own close button", async () => {
    render(<ControlledTagCombobox initialValue={["de", "fr"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Germany" }));
    expect(screen.queryByText("Germany")).not.toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
  });

  it("removes the last chip on Backspace when the search field is empty", async () => {
    render(<ControlledTagCombobox initialValue={["de", "fr"]} />);
    const search = screen.getByRole("combobox").querySelector("input")!;
    await userEvent.click(search);
    await userEvent.keyboard("{Backspace}");
    expect(screen.queryByRole("button", { name: "Remove France" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Germany" })).toBeInTheDocument();
  });

  it("does not remove a chip on Backspace while the search field has text", async () => {
    render(<ControlledTagCombobox initialValue={["de"]} />);
    const search = screen.getByRole("combobox").querySelector("input")!;
    await userEvent.click(search);
    await userEvent.type(search, "fra");
    await userEvent.keyboard("{Backspace}");
    expect(screen.getByText("Germany")).toBeInTheDocument();
  });

  it("navigates with ArrowDown/Enter and toggles the active option", async () => {
    render(<ControlledTagCombobox initialValue={[]} />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = screen.getByRole("combobox").querySelector("input")!;
    await userEvent.type(search, "{ArrowDown}{ArrowDown}{Enter}");
    // index 0 = Switzerland, 1 = Germany -> two ArrowDowns lands on France (index 2)
    expect(screen.getByRole("button", { name: "Remove France" })).toBeInTheDocument();
  });

  it("hides remove buttons and the search input when disabled", () => {
    render(<TagCombobox options={OPTIONS} value={["de"]} onChange={vi.fn()} disabled />);
    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Germany" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox").querySelector("input")).toBeDisabled();
  });
});
