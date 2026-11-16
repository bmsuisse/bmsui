import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TreeSelect, type TreeSelectNode } from "../../../src/patterns/tree-select/TreeSelect";

const nodes: TreeSelectNode[] = [
  { value: "root", label: "Switzerland", children: [
    { value: "west", label: "West", children: [{ value: "team", label: "Team A", children: [] }] },
    { value: "east", label: "East", children: [] },
  ] },
];

describe("TreeSelect", () => {
  it("expands branches and selects a parent or leaf", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TreeSelect nodes={nodes} value={null} onChange={onChange} />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("treeitem", { name: "West" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Switzerland" }));
    await user.click(screen.getByRole("treeitem", { name: "West" }));
    expect(onChange).toHaveBeenCalledWith("west");
    expect(screen.queryByRole("tree")).not.toBeInTheDocument();
  });

  it("searches descendants, keeps their ancestors, and selects the match with Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TreeSelect nodes={nodes} value={null} onChange={onChange} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("textbox"), "team");
    expect(screen.getAllByRole("treeitem").map((item) => item.textContent)).toEqual(["Switzerland", "West", "Team A"]);
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("team");
  });

  it("opens the selected branch and supports arrow navigation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TreeSelect nodes={nodes} value="team" onChange={onChange} />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: "Team A" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("treeitem", { name: "West" })).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getAllByRole("treeitem").filter((item) => item.tabIndex === 0)).toHaveLength(1);
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("team");
  });

  it("keeps a visible tab stop after clearing search on a collapsed descendant", async () => {
    const user = userEvent.setup();
    render(<TreeSelect nodes={nodes} value={null} onChange={vi.fn()} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("textbox"), "team");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: "Team A" })).toHaveFocus();
    await user.tab({ shift: true });
    await user.clear(screen.getByRole("textbox"));
    expect(screen.getByRole("treeitem", { name: "Switzerland" })).toHaveAttribute("tabindex", "0");
  });

  it("displays a saved value without offering it as an available choice", async () => {
    const user = userEvent.setup();
    render(<TreeSelect nodes={nodes} value="old" valueLabel="Old unit" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Old unit");
    await user.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("treeitem", { name: "Old unit" })).not.toBeInTheDocument();
  });

  it("shows an error with retry and an empty search result", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = render(<TreeSelect nodes={nodes} value={null} onChange={vi.fn()} errorMessage="Unavailable" onRetry={retry} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("textbox"), "team{Enter}");
    expect(screen.getByRole("tree")).toBeInTheDocument();
    await user.clear(screen.getByRole("textbox"));
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByRole("treeitem")).not.toBeInTheDocument();
    rerender(<TreeSelect nodes={nodes} value={null} onChange={vi.fn()} />);
    await user.type(screen.getByRole("textbox"), "missing");
    expect(screen.getByText("No matches.")).toBeInTheDocument();
  });
});
