import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, MailEvent, MailMessage, StatusBadge } from "@bmsuisse/ui";

const T = "2026-11-17T09:41:00";
const FILES = [
  { id: "1", name: "Offerte 2026-0412.pdf", size: 1234567, mimeType: "application/pdf", href: "#" },
  { id: "2", name: "Preisliste.xlsx", size: 48210, href: "#" },
];
const BODY = (
  <>
    <p>Guten Tag Herr Keller</p>
    <p className="mt-2">Anbei erhalten Sie die Offerte 2026-0412 für Keller Haustechnik AG. Bei Fragen melden Sie sich unter verkauf@muster-ag.ch.</p>
  </>
);
const QUOTE = <p>Am 14.11.2026 schrieb Keller Haustechnik AG: Könnten Sie uns die Offerte zustellen?</p>;

const meta: Meta<typeof MailMessage> = {
  title: "Patterns/MailMessage",
  component: MailMessage,
  decorators: [(Story) => <div className="w-[40rem] max-w-full"><Story /></div>],
  args: {
    direction: "inbound",
    sender: { name: "Anna Keller", email: "anna@keller-haustechnik.ch" },
    time: T,
    children: BODY,
  },
};
export default meta;
type Story = StoryObj<typeof MailMessage>;

export const Inbound: Story = {
  args: { subject: "Offerte 2026-0412", recipients: { to: ["verkauf@muster-ag.ch"] }, quoted: QUOTE, attachments: FILES },
};
export const Outbound: Story = {
  args: {
    direction: "outbound",
    sender: { name: "Bob Muster", email: "verkauf@muster-ag.ch" },
    recipients: { to: ["anna@keller-haustechnik.ch"], cc: ["buchhaltung@keller-haustechnik.ch"] },
    badges: <StatusBadge status="approved" />,
    actions: (
      <>
        <Button size="sm" variant="outline">Reply</Button>
        <Button size="sm" variant="outline">Forward</Button>
      </>
    ),
  },
};
export const Note: Story = {
  args: { direction: "note", sender: { name: "Bob Muster" }, children: "Kunde telefonisch erreicht, Offerte wird bis Freitag geprüft." },
};
export const Draft: Story = { args: { direction: "outbound", status: "draft", sender: { name: "Bob Muster" } } };
export const Sending: Story = { args: { direction: "outbound", status: "sending", sender: { name: "Bob Muster" } } };
export const Failed: Story = {
  args: { direction: "outbound", status: "failed", error: "SMTP 550 mailbox unavailable", onRetry: () => undefined, sender: { name: "Bob Muster" } },
};
export const Bounced: Story = { args: { direction: "outbound", status: "bounced", sender: { name: "Bob Muster" } } };
export const ManyRecipients: Story = {
  args: {
    direction: "outbound",
    sender: { name: "Bob Muster" },
    recipients: {
      to: ["anna@keller.ch", "peter@keller.ch", "sandra@keller.ch"],
      cc: ["buchhaltung@keller.ch", "einkauf@keller.ch"],
      bcc: ["archiv@muster-ag.ch"],
    },
  },
};
export const LongContent: Story = {
  args: {
    subject: "Sehr langer Betreff ohne Leerzeichen-Offerte-2026-0412-Keller-Haustechnik-AG-Rückfrage-zur-Lieferung",
    children: <p>https://example.ch/a/very/long/url/that/never/ends/and/must/wrap/at/phone/width/2026-11-17/offerte-2026-0412</p>,
  },
};
export const German: Story = {
  args: {
    direction: "outbound",
    status: "failed",
    onRetry: () => undefined,
    quoted: QUOTE,
    sender: { name: "Bob Muster" },
    recipients: { to: ["a@keller.ch", "b@keller.ch", "c@keller.ch", "d@keller.ch"] },
    labels: {
      to: "an",
      showRecipients: "Alle Empfänger anzeigen",
      hideRecipients: "Empfänger einklappen",
      failed: "Senden fehlgeschlagen",
      retry: "Erneut versuchen",
      quoted: { show: "Zitierten Text anzeigen" },
    },
  },
};
export const Thread: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <MailMessage direction="inbound" sender={{ name: "Anna Keller" }} time={T}>Guten Tag, bitte um Offerte.</MailMessage>
      <MailEvent time={T}>Bob Muster assigned this to himself</MailEvent>
      <MailMessage direction="outbound" sender={{ name: "Bob Muster" }} time={T}>Gerne, anbei.</MailMessage>
    </div>
  ),
};
