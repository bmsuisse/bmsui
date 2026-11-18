import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip, ConversationList, ConversationRow } from "@bmsuisse/ui";

const meta: Meta<typeof ConversationRow> = {
  title: "Patterns/ConversationRow",
  component: ConversationRow,
  args: {
    subject: "Offerte 2026-0412",
    preview: "Guten Tag, anbei die gewünschte Offerte für die Sanierung der Heizungsanlage.",
    customer: { name: "Keller Haustechnik AG" },
    time: "2026-11-10T08:00:00Z",
    href: "#",
  },
  decorators: [(Story) => <div className="max-w-full w-[60rem]"><ConversationList aria-label="Posteingang"><Story /></ConversationList></div>],
};

export default meta;
type Story = StoryObj<typeof ConversationRow>;

export const Default: Story = {};

export const Full: Story = {
  args: {
    unread: true,
    starred: true,
    hasAttachments: true,
    threadCount: 4,
    status: "active",
    assignee: { name: "Anna Muster" },
    tags: <Chip size="sm">VIP</Chip>,
  },
};

export const Statuses: Story = {
  render: () => (
    <>
      {(["active", "pending", "closed", "spam"] as const).map((status) => (
        <ConversationRow key={status} subject="Offerte 2026-0412" preview="Guten Tag" customer={{ name: "Keller Haustechnik AG" }} time="2026-11-10T08:00:00Z" status={status} href="#" />
      ))}
    </>
  ),
};

export const Selectable: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>(["b"]);
    const rows = [
      { id: "a", subject: "Offerte 2026-0412", unread: true },
      { id: "b", subject: "Rechnung 2026-1187 unklar" },
      { id: "c", subject: "Lieferverzug Bestellung 4411" },
    ];
    return (
      <>
        {rows.map((r) => (
          <ConversationRow
            key={r.id}
            subject={r.subject}
            unread={r.unread}
            preview="Vielen Dank für Ihre Nachricht"
            customer={{ name: "Muster AG" }}
            time="2026-11-10T08:00:00Z"
            href="#"
            status="active"
            selected={selected.includes(r.id)}
            onSelectedChange={(on) => setSelected((s) => (on ? [...s, r.id] : s.filter((x) => x !== r.id)))}
          />
        ))}
      </>
    );
  },
};

export const LongText: Story = {
  args: {
    subject: "Rückfrage zu Offerte 2026-0412 betreffend Heizungssanierung Mehrfamilienhaus Bahnhofstrasse 12 in Winterthur",
    preview: "https://example.com/ein/sehr/langer/link/der/nicht/umbrechen/will/und/trotzdem/nicht/abgeschnitten/werden/darf",
    customer: { name: "Keller Haustechnik und Sanitär Aktiengesellschaft" },
    unread: true,
    starred: true,
    hasAttachments: true,
    threadCount: 12,
    status: "pending",
    assignee: { name: "Anna Muster" },
    tags: (
      <>
        <Chip size="sm">Offerte</Chip>
        <Chip size="sm">Dringend</Chip>
      </>
    ),
  },
};

export const Static: Story = { args: { href: undefined, preview: undefined } };

export const German: Story = {
  args: { unread: true, starred: true, hasAttachments: true, threadCount: 3, status: "closed", assignee: { name: "Anna Muster" } },
  render: (args) => (
    <ConversationRow
      {...args}
      labels={{
        status: { closed: "Geschlossen" },
        unread: "Ungelesen",
        starred: "Markiert",
        attachments: "Mit Anhängen",
        threads: (n) => `${n} Nachrichten`,
        assignedTo: (name) => `Zugewiesen an ${name}`,
      }}
    />
  ),
};
