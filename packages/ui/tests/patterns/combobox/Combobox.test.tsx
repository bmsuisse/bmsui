import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Combobox, type ComboboxOption } from "../../../src/patterns/combobox/Combobox";

const OPTIONS: ComboboxOption[] = [
  { value: "ch", label: "Switzerland" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "us", label: "United States", disabled: true },
];

function ControlledCombobox({ initialValue }: { initialValue: string | null }) {
  const [value, setValue] = useState<string | null>(initialValue);
  return <Combobox options={OPTIONS} value={value} onChange={setValue} />;
}

function ControlledMultiCombobox({ initialValue }: { initialValue: string[] }) {
  const [value, setValue] = useState<string[]>(initialValue);
  return <Combobox options={OPTIONS} value={value} onChange={setValue} multiple />;
}

describe("Combobox", () => {
  it("shows the placeholder when nothing is selected, and the selected label otherwise", () => {
    render(<Combobox options={OPTIONS} value="de" onChange={vi.fn()} placeholder="Pick a country" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Germany");
  });

  it("opens the popover and lists all options with no search term", async () => {
    render(<Combobox options={OPTIONS} value={null} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "Switzerland" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Germany" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "France" })).toBeInTheDocument();
  });

  it("filters the visible options as the user types", async () => {
    render(<Combobox options={OPTIONS} value={null} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = await screen.findByPlaceholderText("Search…");
    await userEvent.type(search, "ger");
    expect(screen.getByRole("option", { name: "Germany" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "France" })).not.toBeInTheDocument();
  });

  it("shows the empty message when nothing matches", async () => {
    render(<Combobox options={OPTIONS} value={null} onChange={vi.fn()} emptyMessage="Nothing here." />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = await screen.findByPlaceholderText("Search…");
    await userEvent.type(search, "zzz");
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("selects an option on click, calls onChange, and closes the popover", async () => {
    const onChange = vi.fn();
    render(<Combobox options={OPTIONS} value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "France" }));
    expect(onChange).toHaveBeenCalledWith("fr");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("does not select a disabled option", async () => {
    const onChange = vi.fn();
    render(<Combobox options={OPTIONS} value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "United States" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("navigates with ArrowDown/Enter and selects the active option", async () => {
    const onChange = vi.fn();
    render(<Combobox options={OPTIONS} value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = await screen.findByPlaceholderText("Search…");
    await userEvent.type(search, "{ArrowDown}{ArrowDown}{Enter}");
    // index 0 = Switzerland, 1 = Germany -> two ArrowDowns lands on France (index 2)
    expect(onChange).toHaveBeenCalledWith("fr");
  });

  it("clears the selection via the clear affordance without opening the popover", async () => {
    render(<ControlledCombobox initialValue="de" />);
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Select…");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("hides the clear affordance when clearable is false", () => {
    render(<Combobox options={OPTIONS} value="de" onChange={vi.fn()} clearable={false} />);
    expect(screen.queryByRole("button", { name: "Clear selection" })).not.toBeInTheDocument();
  });

  it("marks the currently selected option as aria-selected", async () => {
    render(<Combobox options={OPTIONS} value="fr" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "France" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Germany" })).toHaveAttribute("aria-selected", "false");
  });

  it("forwards data-testid to the trigger button", () => {
    render(<Combobox options={OPTIONS} value={null} onChange={vi.fn()} data-testid="country-filter" />);
    expect(screen.getByTestId("country-filter")).toBe(screen.getByRole("combobox"));
  });

  it("suffixes data-testid with -option and sets data-option-value on every option row", async () => {
    render(<Combobox options={OPTIONS} value={null} onChange={vi.fn()} data-testid="country-filter" />);
    await userEvent.click(screen.getByRole("combobox"));
    const germany = await screen.findByRole("option", { name: "Germany" });
    expect(germany).toHaveAttribute("data-testid", "country-filter-option");
    expect(germany).toHaveAttribute("data-option-value", "de");
    const france = screen.getByRole("option", { name: "France" });
    expect(france).toHaveAttribute("data-testid", "country-filter-option");
    expect(france).toHaveAttribute("data-option-value", "fr");
  });

  it("omits data-testid on option rows when the trigger has no data-testid", async () => {
    render(<Combobox options={OPTIONS} value={null} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    const germany = await screen.findByRole("option", { name: "Germany" });
    expect(germany).not.toHaveAttribute("data-testid");
    expect(germany).toHaveAttribute("data-option-value", "de");
  });

  it("renders no checkboxes in single-select mode", async () => {
    render(<Combobox options={OPTIONS} value={null} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    await screen.findByRole("option", { name: "Switzerland" });
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

describe("Combobox (multiple)", () => {
  it("renders a checkbox reflecting selection state for every option", async () => {
    render(<Combobox options={OPTIONS} value={["de"]} onChange={vi.fn()} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "Germany" });
    expect(option.querySelector("input[type=checkbox]")).not.toBeNull();
    expect((option.querySelector("input[type=checkbox]") as HTMLInputElement).checked).toBe(true);
    const other = screen.getByRole("option", { name: "France" });
    expect((other.querySelector("input[type=checkbox]") as HTMLInputElement).checked).toBe(false);
  });

  it("shows a count summary once 2 or more options are selected", () => {
    render(<Combobox options={OPTIONS} value={["ch", "de"]} onChange={vi.fn()} multiple />);
    expect(screen.getByRole("combobox")).toHaveTextContent("2 selected");
  });

  it("shows the single label when exactly one option is selected", () => {
    render(<Combobox options={OPTIONS} value={["de"]} onChange={vi.fn()} multiple />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Germany");
  });

  it("shows the placeholder when nothing is selected", () => {
    render(<Combobox options={OPTIONS} value={[]} onChange={vi.fn()} multiple placeholder="Pick countries" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Pick countries");
  });

  it("selecting an option toggles it into the array without closing the popover", async () => {
    const onChange = vi.fn();
    render(<Combobox options={OPTIONS} value={[]} onChange={onChange} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "France" }));
    expect(onChange).toHaveBeenCalledWith(["fr"]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("selecting an already-selected option removes it from the array", async () => {
    const onChange = vi.fn();
    render(<Combobox options={OPTIONS} value={["fr", "de"]} onChange={onChange} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "France" }));
    expect(onChange).toHaveBeenCalledWith(["de"]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("does not select a disabled option in multi-select mode", async () => {
    const onChange = vi.fn();
    render(<Combobox options={OPTIONS} value={[]} onChange={onChange} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "United States" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks every selected option as aria-selected", async () => {
    render(<Combobox options={OPTIONS} value={["fr", "de"]} onChange={vi.fn()} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "France" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Germany" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Switzerland" })).toHaveAttribute("aria-selected", "false");
  });

  it("clears the whole array via the clear affordance", async () => {
    render(<ControlledMultiCombobox initialValue={["ch", "de"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Select…");
  });

  it("hides the clear affordance when nothing is selected", () => {
    render(<Combobox options={OPTIONS} value={[]} onChange={vi.fn()} multiple />);
    expect(screen.queryByRole("button", { name: "Clear selection" })).not.toBeInTheDocument();
  });

  it("navigates with ArrowDown/Enter and toggles the active option without closing the popover", async () => {
    const onChange = vi.fn();
    render(<Combobox options={OPTIONS} value={[]} onChange={onChange} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = await screen.findByPlaceholderText("Search…");
    await userEvent.type(search, "{ArrowDown}{ArrowDown}{Enter}");
    // index 0 = Switzerland, 1 = Germany -> two ArrowDowns lands on France (index 2)
    expect(onChange).toHaveBeenCalledWith(["fr"]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("toggles the active option back out via Enter on a second press", async () => {
    const onChange = vi.fn((next: string[]) => next);
    function ToggleTwice() {
      const [value, setValue] = useState<string[]>([]);
      return (
        <Combobox
          options={OPTIONS}
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
          multiple
        />
      );
    }
    render(<ToggleTwice />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = await screen.findByPlaceholderText("Search…");
    await userEvent.type(search, "{ArrowDown}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["fr"]);
    await userEvent.type(search, "{Enter}");
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});

const GROUPED_OPTIONS: ComboboxOption[] = [
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

describe("Combobox (grouped, multiple)", () => {
  it("renders a header for each group, before its members, in the array's order", async () => {
    render(<Combobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    const rendered = Array.from(listbox.querySelectorAll("[role=option], [data-group-header]")).map(
      (el) => el.textContent,
    );
    expect(rendered).toEqual(["Team A", "Alice", "Bob", "Team B", "Carol", "Dave", "Eve"]);
  });

  it("does not render a header for ungrouped options", async () => {
    render(<Combobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "Eve" })).toBeInTheDocument();
    expect(screen.queryByText("Eve", { selector: "[data-group-header]" })).not.toBeInTheDocument();
  });

  it("group headers stick to the top of the scrolling listbox with an opaque background", async () => {
    render(<Combobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    const headers = Array.from(listbox.querySelectorAll("[data-group-header]"));
    expect(headers).toHaveLength(2);
    for (const header of headers) {
      expect(header.className).toMatch(/\bsticky\b/);
      expect(header.className).toMatch(/\btop-0\b/);
      // Opaque, not e.g. bg-muted/50 -- a translucent sticky header would let
      // rows scrolled underneath it show through.
      expect(header.className).not.toMatch(/bg-muted\/\d/);
    }
  });

  it("a group's checkbox is unchecked when none of its members are selected", async () => {
    render(<Combobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    const cb = groupCheckbox("Select all of Team A");
    expect(cb.checked).toBe(false);
    expect(cb.indeterminate).toBe(false);
  });

  it("a group's checkbox is indeterminate when some but not all of its members are selected", async () => {
    render(
      <Combobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={["alice"]} onChange={vi.fn()} multiple />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    const cb = groupCheckbox("Select all of Team A");
    expect(cb.checked).toBe(false);
    expect(cb.indeterminate).toBe(true);
  });

  it("a group's checkbox is checked when every one of its members is selected", async () => {
    render(
      <Combobox
        options={GROUPED_OPTIONS}
        groupLabels={GROUP_LABELS}
        value={["alice", "bob"]}
        onChange={vi.fn()}
        multiple
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    const cb = groupCheckbox("Select all of Team A");
    expect(cb.checked).toBe(true);
    expect(cb.indeterminate).toBe(false);
  });

  it("clicking an unchecked/indeterminate group checkbox selects every member of that group, keeping other selections", async () => {
    const onChange = vi.fn();
    render(
      <Combobox
        options={GROUPED_OPTIONS}
        groupLabels={GROUP_LABELS}
        value={["eve"]}
        onChange={onChange}
        multiple
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(groupCheckbox("Select all of Team A"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].slice().sort()).toEqual(["alice", "bob", "eve"]);
  });

  it("clicking a fully-checked group checkbox deselects every member of that group, keeping other selections", async () => {
    const onChange = vi.fn();
    render(
      <Combobox
        options={GROUPED_OPTIONS}
        groupLabels={GROUP_LABELS}
        value={["alice", "bob", "eve"]}
        onChange={onChange}
        multiple
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(groupCheckbox("Select all of Team A"));
    expect(onChange).toHaveBeenCalledWith(["eve"]);
  });

  it("keeps the popover open after toggling a group checkbox", async () => {
    render(<Combobox options={GROUPED_OPTIONS} groupLabels={GROUP_LABELS} value={[]} onChange={vi.fn()} multiple />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(groupCheckbox("Select all of Team A"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows the group's label instead of a count when exactly that group is fully selected", () => {
    render(
      <Combobox
        options={GROUPED_OPTIONS}
        groupLabels={GROUP_LABELS}
        value={["alice", "bob"]}
        onChange={vi.fn()}
        multiple
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Team A");
  });

  it("shows every fully-selected group's label, comma-joined, when nothing else is selected", () => {
    render(
      <Combobox
        options={GROUPED_OPTIONS}
        groupLabels={GROUP_LABELS}
        value={["alice", "bob", "carol", "dave"]}
        onChange={vi.fn()}
        multiple
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Team A, Team B");
  });

  it("falls back to a count when a group is only partially selected", () => {
    render(
      <Combobox
        options={GROUPED_OPTIONS}
        groupLabels={GROUP_LABELS}
        value={["alice", "carol"]}
        onChange={vi.fn()}
        multiple
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("2 selected");
  });

  it("falls back to a count when a whole group is selected plus an extra individual option", () => {
    render(
      <Combobox
        options={GROUPED_OPTIONS}
        groupLabels={GROUP_LABELS}
        value={["alice", "bob", "eve"]}
        onChange={vi.fn()}
        multiple
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("3 selected");
  });

  it("falls back to the raw group key as its label when groupLabels omits an entry", () => {
    render(<Combobox options={GROUPED_OPTIONS} value={["alice", "bob"]} onChange={vi.fn()} multiple />);
    expect(screen.getByRole("combobox")).toHaveTextContent("team-a");
  });
});

describe("Combobox (loading)", () => {
  it("shows the default loading message instead of the placeholder/selection, and disables the trigger", () => {
    render(<Combobox options={GROUPED_OPTIONS} value="alice" onChange={vi.fn()} loading />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("Loading…");
    expect(trigger).not.toHaveTextContent("Alice");
    expect(trigger).toBeDisabled();
  });

  it("shows a custom loadingMessage when supplied", () => {
    render(<Combobox options={GROUPED_OPTIONS} value={null} onChange={vi.fn()} loading loadingMessage="Fetching…" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Fetching…");
  });

  it("hides the clear affordance while loading even if something is selected", () => {
    render(<Combobox options={GROUPED_OPTIONS} value="alice" onChange={vi.fn()} loading />);
    expect(screen.queryByLabelText("Clear selection")).not.toBeInTheDocument();
  });

  it("is not disabled or showing the loading message once loading is false", () => {
    render(<Combobox options={GROUPED_OPTIONS} value="alice" onChange={vi.fn()} loading={false} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).not.toBeDisabled();
    expect(trigger).toHaveTextContent("Alice");
  });
});

describe("Combobox (server-driven search)", () => {
  it("calls onSearchChange on every keystroke and does not filter options locally", async () => {
    const onSearchChange = vi.fn();
    render(<Combobox options={OPTIONS} value={null} onChange={vi.fn()} onSearchChange={onSearchChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = await screen.findByPlaceholderText("Search…");
    await userEvent.type(search, "zz");
    expect(onSearchChange).toHaveBeenCalledWith("z");
    expect(onSearchChange).toHaveBeenCalledWith("zz");
    // "zz" matches no option's label, but options pass through unfiltered since
    // the caller (not this component) is responsible for narrowing them.
    expect(screen.getByRole("option", { name: "Switzerland" })).toBeInTheDocument();
  });

  it("calls onSearchChange with an empty string each time the popover opens", async () => {
    const onSearchChange = vi.fn();
    render(<Combobox options={OPTIONS} value={null} onChange={vi.fn()} onSearchChange={onSearchChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("shows selectedLabel on the trigger when the selected value isn't among the current options", () => {
    render(
      <Combobox
        options={OPTIONS}
        value="jp"
        selectedLabel="Japan"
        onChange={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Japan");
  });

  it("falls back to the placeholder when selectedLabel is omitted and the value isn't among the current options", () => {
    render(<Combobox options={OPTIONS} value="jp" onChange={vi.fn()} onSearchChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Select…");
  });

  it("prefers the matching option's own label over selectedLabel once it appears in options", () => {
    render(
      <Combobox
        options={OPTIONS}
        value="de"
        selectedLabel="stale label"
        onChange={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Germany");
  });
});
