import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TreeView, type TreeViewNode } from "../../../src/patterns/tree-view/TreeView";

const nodes: TreeViewNode[] = [
  {
    id: "a",
    label: "Alpha",
    children: [
      { id: "a1", label: "Apple" },
      { id: "a2", label: "Avocado", disabled: true },
      { id: "a3", label: "Apricot" },
    ],
  },
  { id: "b", label: "Beta", children: [{ id: "b1", label: "Berry" }] },
  { id: "c", label: "Gamma" },
];

const item = (name: string) => screen.getByRole("treeitem", { name });

describe("TreeView", () => {
  it("renders aria level/setsize/posinset and expanded state", () => {
    render(<TreeView nodes={nodes} defaultExpandedIds={["a"]} aria-label="Tree" />);
    expect(screen.getByRole("tree", { name: "Tree" })).toBeInTheDocument();
    expect(item("Alpha")).toHaveAttribute("aria-expanded", "true");
    expect(item("Beta")).toHaveAttribute("aria-expanded", "false");
    expect(item("Gamma")).not.toHaveAttribute("aria-expanded");
    expect(item("Apricot")).toHaveAttribute("aria-level", "2");
    expect(item("Apricot")).toHaveAttribute("aria-setsize", "3");
    expect(item("Apricot")).toHaveAttribute("aria-posinset", "3");
    expect(screen.queryByRole("treeitem", { name: "Berry" })).toBeNull();
  });

  it("uses a roving tabindex and moves with arrow keys", async () => {
    const user = userEvent.setup();
    render(<TreeView nodes={nodes} defaultExpandedIds={["a"]} />);
    expect(item("Alpha")).toHaveAttribute("tabindex", "0");
    expect(item("Beta")).toHaveAttribute("tabindex", "-1");
    item("Alpha").focus();
    await user.keyboard("{ArrowDown}");
    expect(item("Apple")).toHaveFocus();
    expect(item("Apple")).toHaveAttribute("tabindex", "0");
    expect(item("Alpha")).toHaveAttribute("tabindex", "-1");
    await user.keyboard("{End}");
    expect(item("Gamma")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("Alpha")).toHaveFocus();
  });

  it("expands with ArrowRight, steps into children, collapses with ArrowLeft and goes to the parent", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(<TreeView nodes={nodes} onExpandedChange={onExpandedChange} />);
    item("Alpha").focus();
    await user.keyboard("{ArrowRight}");
    expect(onExpandedChange).toHaveBeenLastCalledWith(["a"]);
    expect(item("Alpha")).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowRight}");
    expect(item("Apple")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("Alpha")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("Alpha")).toHaveAttribute("aria-expanded", "false");
  });

  it("* expands all siblings", async () => {
    const user = userEvent.setup();
    render(<TreeView nodes={nodes} />);
    item("Alpha").focus();
    await user.keyboard("*");
    expect(item("Alpha")).toHaveAttribute("aria-expanded", "true");
    expect(item("Beta")).toHaveAttribute("aria-expanded", "true");
    expect(item("Berry")).toBeInTheDocument();
  });

  it("typeahead focuses the next matching row", async () => {
    const user = userEvent.setup();
    render(<TreeView nodes={nodes} />);
    item("Alpha").focus();
    await user.keyboard("g");
    expect(item("Gamma")).toHaveFocus();
    await new Promise((r) => setTimeout(r, 600));
    await user.keyboard("b");
    expect(item("Beta")).toHaveFocus();
  });

  it("works controlled for expansion", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(<TreeView nodes={nodes} expandedIds={[]} onExpandedChange={onExpandedChange} />);
    await user.click(item("Alpha"));
    expect(onExpandedChange).toHaveBeenCalledWith(["a"]);
    expect(item("Alpha")).toHaveAttribute("aria-expanded", "false");
  });

  it("single selection sets aria-selected and replaces the selection", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(<TreeView nodes={nodes} selectionMode="single" defaultExpandedIds={["a"]} onSelectedChange={onSelectedChange} />);
    await user.click(item("Apple"));
    expect(item("Apple")).toHaveAttribute("aria-selected", "true");
    await user.click(item("Gamma"));
    expect(item("Apple")).toHaveAttribute("aria-selected", "false");
    expect(onSelectedChange).toHaveBeenLastCalledWith(["c"]);
    item("Beta").focus();
    await user.keyboard(" ");
    expect(onSelectedChange).toHaveBeenLastCalledWith(["b"]);
  });

  it("multiple selection toggles and marks the tree multiselectable", async () => {
    const user = userEvent.setup();
    render(<TreeView nodes={nodes} selectionMode="multiple" />);
    expect(screen.getByRole("tree")).toHaveAttribute("aria-multiselectable", "true");
    await user.click(item("Gamma"));
    await user.click(item("Beta"));
    expect(item("Gamma")).toHaveAttribute("aria-selected", "true");
    await user.click(item("Gamma"));
    expect(item("Gamma")).toHaveAttribute("aria-selected", "false");
    expect(item("Beta")).toHaveAttribute("aria-selected", "true");
  });

  it("checkable: tri-state parents, cascade, disabled children skipped", async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [ids, setIds] = useState<string[]>([]);
      return <TreeView nodes={nodes} checkable defaultExpandedIds={["a"]} selectedIds={ids} onSelectedChange={setIds} />;
    };
    render(<Harness />);
    expect(item("Alpha")).toHaveAttribute("aria-checked", "false");
    await user.click(item("Apple"));
    expect(item("Apple")).toHaveAttribute("aria-checked", "true");
    expect(item("Alpha")).toHaveAttribute("aria-checked", "mixed");
    await user.click(item("Apricot"));
    // Avocado is disabled and does not count, so the parent is complete.
    expect(item("Alpha")).toHaveAttribute("aria-checked", "true");
    await user.click(item("Alpha"));
    expect(item("Apple")).toHaveAttribute("aria-checked", "false");
    expect(item("Alpha")).toHaveAttribute("aria-checked", "false");
    await user.click(item("Alpha"));
    expect(item("Apple")).toHaveAttribute("aria-checked", "true");
    expect(item("Avocado")).toHaveAttribute("aria-checked", "false");
  });

  it("disabled rows cannot be selected", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(<TreeView nodes={nodes} selectionMode="single" defaultExpandedIds={["a"]} onSelectedChange={onSelectedChange} />);
    await user.click(item("Avocado"));
    expect(item("Avocado")).toHaveAttribute("aria-disabled", "true");
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it("lazy-loads on expand with a loading row, then shows children", async () => {
    const user = userEvent.setup();
    let resolve: (n: TreeViewNode[]) => void = () => {};
    const onLoadChildren = vi.fn(() => new Promise<TreeViewNode[]>((r) => (resolve = r)));
    render(<TreeView nodes={[{ id: "x", label: "Lazy", hasChildren: true }]} onLoadChildren={onLoadChildren} />);
    expect(item("Lazy")).toHaveAttribute("aria-expanded", "false");
    await user.click(item("Lazy"));
    expect(onLoadChildren).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(item("Lazy")).toHaveAttribute("aria-busy", "true");
    resolve([{ id: "x1", label: "Child" }]);
    expect(await screen.findByRole("treeitem", { name: "Child" })).toHaveAttribute("aria-level", "2");
    await user.click(item("Lazy"));
    await user.click(item("Lazy"));
    expect(onLoadChildren).toHaveBeenCalledTimes(1);
  });

  it("shows an error row and retries", async () => {
    const user = userEvent.setup();
    const onLoadChildren = vi
      .fn<(n: TreeViewNode) => Promise<TreeViewNode[]>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([{ id: "x1", label: "Child" }]);
    render(<TreeView nodes={[{ id: "x", label: "Lazy", hasChildren: true }]} onLoadChildren={onLoadChildren} labels={{ retry: "Again" }} />);
    await user.click(item("Lazy"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load");
    fireEvent.click(screen.getByRole("button", { name: "Again" }));
    await waitFor(() => expect(screen.getByRole("treeitem", { name: "Child" })).toBeInTheDocument());
    expect(onLoadChildren).toHaveBeenCalledTimes(2);
  });

  it("loads a lazy branch that starts expanded", async () => {
    const onLoadChildren = vi.fn(async () => [{ id: "x1", label: "Child" }]);
    render(<TreeView nodes={[{ id: "x", label: "Lazy", hasChildren: true }]} defaultExpandedIds={["x"]} onLoadChildren={onLoadChildren} />);
    expect(await screen.findByRole("treeitem", { name: "Child" })).toBeInTheDocument();
  });

  it("renderNode replaces the row content", () => {
    render(<TreeView nodes={nodes} renderNode={(n, s) => <b data-testid={`n-${n.id}`}>{`${n.label}:${s.level}`}</b>} />);
    expect(screen.getByTestId("n-a")).toHaveTextContent("Alpha:1");
  });

  it("Enter calls onActivate", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<TreeView nodes={nodes} onActivate={onActivate} />);
    item("Gamma").focus();
    await user.keyboard("{Enter}");
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: "c" }));
  });

  it("shows the empty label", () => {
    render(<TreeView nodes={[]} labels={{ empty: "Nothing" }} />);
    expect(screen.getByText("Nothing")).toBeInTheDocument();
  });
});
