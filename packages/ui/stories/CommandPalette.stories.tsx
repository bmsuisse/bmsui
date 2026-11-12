import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { ChartBarIcon, Cog6ToothIcon, DocumentPlusIcon, MoonIcon, UserGroupIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import {
  type CommandItem,
  CommandPalette,
  CommandPaletteTrigger,
  toast,
  Toaster,
  useCommandPaletteHotkey,
  useRecentCommands,
} from "@bmsuisse/ui";

const meta: Meta<typeof CommandPalette> = {
  title: "Patterns/CommandPalette",
  component: CommandPalette,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof meta>;

function useCommands(): CommandItem[] {
  return useMemo(
    () => [
      { id: "new-offer", group: "Create", label: "New offer", icon: DocumentPlusIcon, shortcut: ["⌘", "N"], keywords: ["angebot"], onSelect: () => toast("New offer") },
      { id: "new-contact", group: "Create", label: "New contact", icon: UserPlusIcon, onSelect: () => toast("New contact") },
      { id: "go-customers", group: "Go to", label: "Customers", icon: UserGroupIcon, shortcut: "G C", onSelect: () => toast("Customers") },
      { id: "go-reports", group: "Go to", label: "Reports", icon: ChartBarIcon, keywords: ["kpi"], onSelect: () => toast("Reports") },
      { id: "go-settings", group: "Go to", label: "Settings", icon: Cog6ToothIcon, disabled: "Not allowed for your role", onSelect: () => {} },
      { id: "dark", group: "Preferences", label: "Toggle dark mode", icon: MoonIcon, onSelect: () => document.documentElement.classList.toggle("dark") },
    ],
    [],
  );
}

function Demo({ withRecent = false, hotkey = true }: { withRecent?: boolean; hotkey?: boolean }) {
  const [open, setOpen] = useState(false);
  const { recent, push } = useRecentCommands("storybook");
  const commands = useCommands();
  useCommandPaletteHotkey(() => setOpen((o) => !o), { enabled: hotkey });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <CommandPaletteTrigger onClick={() => setOpen(true)} />
      {hotkey && <span className="text-sm text-muted-foreground">or press Cmd/Ctrl+K</span>}
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        commands={commands}
        recent={withRecent ? recent : undefined}
        onCommandRun={withRecent ? push : undefined}
        groupOrder={["Create", "Go to", "Preferences"]}
      />
      <Toaster />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const WithRecentCommands: Story = { render: () => <Demo withRecent /> };
export const TriggerOnly: Story = { render: () => <Demo hotkey={false} /> };
