import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  FunnelIcon,
  InformationCircleIcon,
  ReceiptPercentIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { NavGroup, NavItem, Sidebar, SidebarNav } from "@bmsuisse/ui";

const meta: Meta<typeof Sidebar> = {
  title: "Patterns/Sidebar",
  component: Sidebar,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof meta>;

function Shell({ initialCollapsed = false, resizable = false }: { initialCollapsed?: boolean; resizable?: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [active, setActive] = useState("overview");
  const item = (key: string, icon: typeof Squares2X2Icon, label: string) => (
    <NavItem as="button" type="button" icon={icon} label={label} active={active === key} onClick={() => setActive(key)} />
  );
  return (
    <div className="flex h-[480px] overflow-hidden border-b border-border">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        resizable={resizable}
        header={(isCollapsed) => <span className="truncate text-sm font-semibold">{isCollapsed ? "D" : "Demo App"}</span>}
        footer="v0.7.0"
      >
        <NavGroup label="Work">
          {item("overview", Squares2X2Icon, "Overview")}
          {item("approvals", ClipboardDocumentCheckIcon, "Approvals")}
        </NavGroup>
        <NavGroup label="Bonus rules" defaultCollapsed>
          {item("rules", ReceiptPercentIcon, "Bonus Rules")}
          {item("templates", FunnelIcon, "Filter Templates")}
        </NavGroup>
        <NavGroup label="Info">
          {item("info", InformationCircleIcon, "Info")}
          {item("settings", Cog6ToothIcon, "Settings")}
        </NavGroup>
      </Sidebar>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Page content</div>
    </div>
  );
}

export const Default: Story = { render: () => <Shell /> };
export const RailCollapsed: Story = { render: () => <Shell initialCollapsed /> };
export const Resizable: Story = { render: () => <Shell resizable /> };
export const NavOnly: Story = {
  render: () => (
    <div className="flex h-72 w-64 flex-col rounded-lg border border-border">
      <SidebarNav>
        <NavGroup label="Menu">
          <NavItem as="button" type="button" icon={Squares2X2Icon} label="Overview" active />
          <NavItem as="button" type="button" icon={Cog6ToothIcon} label="Settings" />
        </NavGroup>
      </SidebarNav>
    </div>
  ),
};
