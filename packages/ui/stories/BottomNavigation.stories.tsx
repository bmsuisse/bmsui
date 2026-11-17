import { CalendarIcon, PlusIcon, SparklesIcon, Squares2X2Icon, UsersIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { useState } from "react";
import { BottomNavigation, BottomNavigationAction, type BottomNavigationItem } from "@bmsuisse/ui";

const cockpit: BottomNavigationItem = { id: "cockpit", label: "Cockpit", icon: Squares2X2Icon };
const calendar: BottomNavigationItem = { id: "calendar", label: "Calendar", icon: CalendarIcon, badge: 3 };
const customers: BottomNavigationItem = { id: "customers", label: "Customers", icon: UsersIcon };
const chat: BottomNavigationItem = { id: "chat", label: "Assistant", icon: SparklesIcon };
const items: BottomNavigationItem[] = [cockpit, calendar, customers, chat];

/** A phone-sized frame: the transform makes `fixed` position against the frame, not the viewport. */
function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-72 w-[375px] max-w-full overflow-hidden rounded-xl border border-foreground/10 bg-background [transform:translateZ(0)] dark:border-border">
      <p className="p-4 text-sm text-muted-foreground">Page content</p>
      {children}
    </div>
  );
}

const meta: Meta<typeof BottomNavigation> = {
  title: "Patterns/BottomNavigation",
  component: BottomNavigation,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof BottomNavigation>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("cockpit");
    return (
      <Phone>
        <BottomNavigation aria-label="Main" items={items} value={value} onValueChange={setValue} />
      </Phone>
    );
  },
};

export const WithCentreAction: Story = {
  render: () => {
    const [value, setValue] = useState("cockpit");
    return (
      <Phone>
        <BottomNavigation
          aria-label="Main"
          items={items}
          value={value}
          onValueChange={setValue}
          action={<BottomNavigationAction icon={PlusIcon} label="Quick actions" />}
        />
      </Phone>
    );
  },
};

export const Badges: Story = {
  render: () => (
    <Phone>
      <BottomNavigation
        aria-label="Main"
        items={[
          { ...cockpit, badge: true },
          { ...calendar, badge: 120 },
          { ...customers, badge: "new" },
        ]}
        defaultValue="calendar"
      />
    </Phone>
  ),
};

export const DisabledItem: Story = {
  render: () => (
    <Phone>
      <BottomNavigation aria-label="Main" items={[cockpit, { ...calendar, disabled: true }, customers]} defaultValue="cockpit" />
    </Phone>
  ),
};

export const Links: Story = {
  render: () => (
    <Phone>
      <BottomNavigation
        aria-label="Main"
        value="customers"
        items={items.map((i) => ({ ...i, href: `#${i.id}` }))}
        renderLink={({ href, className, children, item, ...rest }) => (
          <a href={href} className={className} data-item={item.id} {...rest}>
            {children}
          </a>
        )}
      />
    </Phone>
  ),
};

export const LongLabels: Story = {
  render: () => (
    <Phone>
      <BottomNavigation
        aria-label="Main"
        defaultValue="a"
        items={[
          { id: "a", label: "Verkaufsübersicht", icon: Squares2X2Icon },
          { id: "b", label: "Kundenverwaltung", icon: UsersIcon },
          { id: "c", label: "Terminplanung", icon: CalendarIcon },
          { id: "d", label: "Assistent", icon: SparklesIcon },
          { id: "e", label: "Einstellungen", icon: Squares2X2Icon },
        ]}
      />
    </Phone>
  ),
};

export const StaticPosition: Story = {
  render: () => <BottomNavigation aria-label="Main" items={items} defaultValue="chat" position="static" className="max-w-sm rounded-xl border" />,
};

export const NoAnimation: Story = {
  render: () => (
    <Phone>
      <BottomNavigation aria-label="Main" items={items} defaultValue="cockpit" animated={false} />
    </Phone>
  ),
};

export const GermanLabels: Story = {
  render: () => (
    <Phone>
      <BottomNavigation
        aria-label="Hauptnavigation"
        items={[
          { ...cockpit, label: "Cockpit" },
          { ...calendar, label: "Kalender" },
          { ...customers, label: "Kunden" },
          { ...chat, label: "Assistent" },
        ]}
        defaultValue="cockpit"
        labels={{ badge: (b) => `${b} neu`, dot: "Neu" }}
      />
    </Phone>
  ),
};
