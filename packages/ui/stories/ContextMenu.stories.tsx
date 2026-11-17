import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@bmsuisse/ui";

const meta: Meta<typeof ContextMenu> = {
  title: "Primitives/ContextMenu",
  component: ContextMenu,
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof ContextMenu>;

// ContextMenuPortal is applied by ContextMenuContent itself; it is only exported for custom containers.

/** Right-click (or long-press on touch) inside the dashed area. */
export const Default: Story = {
  render: () => {
    const [bookmarks, setBookmarks] = useState(true);
    const [sort, setSort] = useState("name");
    return (
      <ContextMenu>
        <ContextMenuTrigger className="flex h-40 items-center justify-center rounded-lg border border-dashed border-foreground/30 px-3 text-center text-sm text-muted-foreground">
          Right-click or long-press here
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>Actions</ContextMenuLabel>
          <ContextMenuGroup>
            <ContextMenuItem>
              Open <ContextMenuShortcut>Enter</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Duplicate <ContextMenuShortcut>⌘D</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem disabled>Share (disabled)</ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks}>
            Show bookmarks
          </ContextMenuCheckboxItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Sort by</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup value={sort} onValueChange={setSort}>
                <ContextMenuRadioItem value="name">Name</ContextMenuRadioItem>
                <ContextMenuRadioItem value="date">Date</ContextMenuRadioItem>
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem danger>
            Delete <ContextMenuShortcut>⌫</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};

const ROWS = [
  { id: "1", name: "Müller AG", city: "Bern" },
  { id: "2", name: "Keller Haustechnik", city: "Zürich" },
  { id: "3", name: "Sanitär Meier", city: "Luzern" },
];

/** Row actions on a list: right-click a row. Keep a visible "⋯" menu too for touch and keyboard users. */
export const OnRows: Story = {
  render: () => {
    const [last, setLast] = useState("none");
    return (
      <div className="space-y-2">
        <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10 text-sm dark:divide-border dark:border-border">
          {ROWS.map((row) => (
            <ContextMenu key={row.id}>
              <ContextMenuTrigger asChild>
                <li className="flex items-center justify-between gap-2 px-3 py-2.5 data-[state=open]:bg-foreground/[0.06]">
                  <span className="min-w-0 truncate font-medium">{row.name}</span>
                  <span className="shrink-0 text-muted-foreground">{row.city}</span>
                </li>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => setLast(`open ${row.name}`)}>Open</ContextMenuItem>
                <ContextMenuItem onSelect={() => setLast(`copy ${row.name}`)}>Copy name</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem danger onSelect={() => setLast(`delete ${row.name}`)}>
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Last action: {last}</p>
      </div>
    );
  },
};
