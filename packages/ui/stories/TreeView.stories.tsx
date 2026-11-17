import { DocumentIcon, FolderIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TreeView, type TreeViewNode } from "@bmsuisse/ui";

const icon = (n: number) => <FolderIcon key={n} />;

const files: TreeViewNode[] = [
  {
    id: "docs",
    label: "Documents",
    icon: icon(1),
    children: [
      { id: "contracts", label: "Contracts", icon: icon(2), children: [
        { id: "c1", label: "Framework agreement 2026.pdf", icon: <DocumentIcon /> },
        { id: "c2", label: "Amendment 3.pdf", icon: <DocumentIcon /> },
        { id: "c3", label: "Archived draft (do not use).pdf", icon: <DocumentIcon />, disabled: true },
      ] },
      { id: "offers", label: "Offers", icon: icon(3), children: [{ id: "o1", label: "Offer Q3.xlsx", icon: <DocumentIcon /> }] },
    ],
  },
  { id: "images", label: "Images", icon: icon(4), children: [{ id: "i1", label: "Logo.svg", icon: <DocumentIcon /> }] },
  { id: "readme", label: "README.md", icon: <DocumentIcon /> },
  {
    id: "long",
    label: "A folder with a very long name that has to wrap on a phone instead of pushing the layout sideways",
    icon: icon(5),
    children: [{ id: "l1", label: "Child" }],
  },
];

const meta: Meta<typeof TreeView> = {
  title: "Patterns/TreeView",
  component: TreeView,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="w-80 max-w-full rounded-lg border border-foreground/10 p-2 dark:border-border"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof TreeView>;

export const Default: Story = {
  render: () => <TreeView aria-label="Files" nodes={files} defaultExpandedIds={["docs"]} onActivate={() => {}} />,
};

export const SingleSelection: Story = {
  render: () => {
    const [ids, setIds] = useState<string[]>(["o1"]);
    return <TreeView aria-label="Files" nodes={files} selectionMode="single" selectedIds={ids} onSelectedChange={setIds} defaultExpandedIds={["docs", "offers"]} />;
  },
};

export const MultipleSelection: Story = {
  render: () => {
    const [ids, setIds] = useState<string[]>(["readme"]);
    return <TreeView aria-label="Files" nodes={files} selectionMode="multiple" selectedIds={ids} onSelectedChange={setIds} defaultExpandedIds={["docs"]} />;
  },
};

export const CheckableTriState: Story = {
  render: () => {
    const [ids, setIds] = useState<string[]>(["c1"]);
    return (
      <div className="flex flex-col gap-2">
        <TreeView aria-label="Files" nodes={files} checkable selectedIds={ids} onSelectedChange={setIds} defaultExpandedIds={["docs", "contracts"]} />
        <p className="px-2 text-xs text-muted-foreground">Checked: {ids.join(", ") || "none"}</p>
      </div>
    );
  },
};

const lazyRoot: TreeViewNode[] = [
  { id: "emea", label: "EMEA", hasChildren: true },
  { id: "apac", label: "APAC (fails to load)", hasChildren: true },
  { id: "amer", label: "Americas", hasChildren: true },
];

export const LazyLoadingWithError: Story = {
  render: () => {
    const [attempts, setAttempts] = useState(0);
    return (
      <TreeView
        aria-label="Regions"
        nodes={lazyRoot}
        onLoadChildren={async (node) => {
          await new Promise((r) => setTimeout(r, 900));
          if (node.id === "apac" && attempts < 1) {
            setAttempts((a) => a + 1);
            throw new Error("offline");
          }
          return [
            { id: `${node.id}-1`, label: `${node.label.split(" ")[0]} North` },
            { id: `${node.id}-2`, label: `${node.label.split(" ")[0]} South`, hasChildren: true },
          ];
        }}
      />
    );
  },
};

export const CustomRows: Story = {
  render: () => (
    <TreeView
      aria-label="Files"
      nodes={files}
      defaultExpandedIds={["docs"]}
      renderNode={(node, state) => (
        <>
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          {state.isBranch && <span className="shrink-0 rounded-md bg-foreground/10 px-1.5 text-xs">{node.children?.length ?? 0}</span>}
        </>
      )}
    />
  ),
};

export const ControlledExpansion: Story = {
  render: () => {
    const [open, setOpen] = useState<string[]>(["docs", "contracts"]);
    return (
      <div className="flex flex-col gap-2">
        <button type="button" className="self-start rounded-md border border-foreground/10 px-2 py-1 text-sm dark:border-border" onClick={() => setOpen([])}>
          Collapse all
        </button>
        <TreeView aria-label="Files" nodes={files} expandedIds={open} onExpandedChange={setOpen} />
      </div>
    );
  },
};

export const GermanLabels: Story = {
  render: () => <TreeView aria-label="Dateien" nodes={[]} labels={{ empty: "Keine Einträge" }} />,
};

export const Empty: Story = { render: () => <TreeView aria-label="Files" nodes={[]} /> };

export const NoAnimation: Story = {
  render: () => <TreeView aria-label="Files" nodes={files} animated={false} defaultExpandedIds={["docs"]} />,
};
