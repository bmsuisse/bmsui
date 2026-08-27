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

const GROUPED_OPTIONS: TagComboboxOption[] = [
  { value: "alice", label: "Alice", group: "team-a" },
  { value: "bob", label: "Bob", group: "team-a" },
  { value: "carol", label: "Carol", group: "team-b" },
  { value: "dave", label: "Dave", group: "team-b" },
  { value: "eve", label: "Eve" },
];
const GROUP_LABELS = { "team-a": "Team A", "team-b": "Team B" };

function groupCheckbox(name: string): HTMLInputElement {
  return screen.getByRole("checkbox", { name }) as HTMLInputElement;
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

  it("does not remove a chip for an option disabled in the options list, via its own remove button", async () => {
    // "us" is seeded into `value` directly (e.g. selected before being disabled
    // server-side) -- its dropdown row would refuse to uncheck it too, per
    // "does not select a disabled option" above; its chip must refuse the same way.
    const onChange = vi.fn();
    render(<TagCombobox options={OPTIONS} value={["us"]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove United States" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("United States")).toBeInTheDocument();
  });

  it("does not remove a disabled option's chip on Backspace either", async () => {
    const onChange = vi.fn();
    render(<TagCombobox options={OPTIONS} value={["us"]} onChange={onChange} />);
    const search = screen.getByRole("combobox").querySelector("input")!;
    await userEvent.click(search);
    await userEvent.keyboard("{Backspace}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("recovers from ArrowDown on a momentarily-empty filtered list once matches reappear", async () => {
    render(<ControlledTagCombobox initialValue={[]} />);
    const search = screen.getByRole("combobox").querySelector("input")!;
    await userEvent.click(search);
    await userEvent.type(search, "zzz{ArrowDown}{ArrowDown}");
    for (let i = 0; i < 3; i++) await userEvent.keyboard("{Backspace}");
    // Back to an empty search term -- every option matches again; Enter must
    // land on a real option (index 0), not stay stuck below zero (which would
    // read `visibleOptions[-1]` -- `undefined` -- and silently no-op instead).
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Remove Switzerland" })).toBeInTheDocument();
  });
});

describe("TagCombobox (grouped)", () => {
  it("renders a header for each group, before its members, in the array's order", async () => {
    render(<TagCombobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    const rendered = Array.from(listbox.querySelectorAll("[role=option], [data-group-header]")).map(
      (el) => el.textContent,
    );
    expect(rendered).toEqual(["Team A", "Alice", "Bob", "Team B", "Carol", "Dave", "Eve"]);
  });

  it("does not render a header for ungrouped options", async () => {
    render(<TagCombobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "Eve" })).toBeInTheDocument();
    expect(screen.queryByText("Eve", { selector: "[data-group-header]" })).not.toBeInTheDocument();
  });

  it("a group header shares its containing block with every one of its group's rows, not just the first", async () => {
    render(<TagCombobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    const teamAHeader = Array.from(listbox.querySelectorAll("[data-group-header]")).find(
      (el) => el.textContent === "Team A",
    );
    expect(teamAHeader).toBeTruthy();
    const container = teamAHeader!.parentElement!;
    expect(container.querySelector('[data-option-value="alice"]')).toBeInTheDocument();
    expect(container.querySelector('[data-option-value="bob"]')).toBeInTheDocument();
    expect(container.querySelector('[data-option-value="carol"]')).not.toBeInTheDocument();
  });

  it("group headers stick to the top of the scrolling listbox with an opaque background", async () => {
    render(<TagCombobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    const headers = Array.from(listbox.querySelectorAll("[data-group-header]"));
    expect(headers).toHaveLength(2);
    for (const header of headers) {
      expect(header.className).toMatch(/\bsticky\b/);
      expect(header.className).toMatch(/\btop-0\b/);
      expect(header.className).not.toMatch(/bg-muted\/\d/);
    }
  });

  it("a group's checkbox is unchecked when none of its members are selected", async () => {
    render(<TagCombobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    const cb = groupCheckbox("Select all of Team A");
    expect(cb.checked).toBe(false);
    expect(cb.indeterminate).toBe(false);
  });

  it("a group's checkbox is indeterminate when some but not all of its members are selected", async () => {
    render(
      <TagCombobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={["alice"]} onChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    const cb = groupCheckbox("Select all of Team A");
    expect(cb.checked).toBe(false);
    expect(cb.indeterminate).toBe(true);
  });

  it("a group's checkbox is checked when every one of its members is selected", async () => {
    render(
      <TagCombobox
        options={GROUPED_OPTIONS}
        groupLabels={GROUP_LABELS}
        value={["alice", "bob"]}
        onChange={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    const cb = groupCheckbox("Select all of Team A");
    expect(cb.checked).toBe(true);
    expect(cb.indeterminate).toBe(false);
  });

  it("clicking an unchecked/indeterminate group checkbox selects every member of that group, keeping other selections", async () => {
    const onChange = vi.fn();
    render(<TagCombobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={["eve"]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(groupCheckbox("Select all of Team A"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].slice().sort()).toEqual(["alice", "bob", "eve"]);
  });

  it("clicking a fully-checked group checkbox deselects every member of that group, keeping other selections", async () => {
    const onChange = vi.fn();
    render(
      <TagCombobox
        options={GROUPED_OPTIONS}
        groupLabels={GROUP_LABELS}
        value={["alice", "bob", "eve"]}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(groupCheckbox("Select all of Team A"));
    expect(onChange).toHaveBeenCalledWith(["eve"]);
  });

  it("keeps the popover open after toggling a group checkbox", async () => {
    render(<TagCombobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(groupCheckbox("Select all of Team A"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("falls back to the raw group key when groupLabels has no entry for it", async () => {
    render(<TagCombobox options={GROUPED_OPTIONS} value={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByText("team-a")).toBeInTheDocument();
  });

  it("a group's checkbox reflects every member's state, not just the ones a search term leaves visible", async () => {
    // alice (team-a) is selected but hidden once the list is filtered down to "bob" --
    // the header must still read indeterminate (one of two members selected), not
    // "unchecked" just because the selected member itself isn't currently rendered.
    render(<TagCombobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={["alice"]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = screen.getByRole("combobox").querySelector("input")!;
    await userEvent.type(search, "bob");
    const cb = groupCheckbox("Select all of Team A");
    expect(cb.checked).toBe(false);
    expect(cb.indeterminate).toBe(true);
  });

  it("toggling a group checkbox while a search is active still selects every member, including ones the search hides", async () => {
    const onChange = vi.fn();
    render(<TagCombobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = screen.getByRole("combobox").querySelector("input")!;
    await userEvent.type(search, "bob");
    await userEvent.click(groupCheckbox("Select all of Team A"));
    expect(onChange.mock.calls[0]![0].slice().sort()).toEqual(["alice", "bob"]);
  });
});
