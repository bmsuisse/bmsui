import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ApprovalCard, type ApprovalStatus } from "@bmsuisse/ui";

const details = (
  <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
    <dt className="text-muted-foreground">to</dt>
    <dd>anna.muster@example.ch</dd>
    <dt className="text-muted-foreground">subject</dt>
    <dd>Offerte 2026-0412 – Angebot Zementlieferung</dd>
    <dt className="text-muted-foreground">attachments</dt>
    <dd>offerte-2026-0412.pdf</dd>
  </dl>
);

const meta: Meta<typeof ApprovalCard> = {
  title: "Patterns/ApprovalCard",
  component: ApprovalCard,
  args: {
    title: "Send email to Anna Muster",
    description: "Nothing has been sent yet. Review the exact action below.",
    details,
    onApprove: () => undefined,
    onReject: () => undefined,
  },
  decorators: [(Story) => <div className="w-[32rem] max-w-full"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof ApprovalCard>;

export const Pending: Story = {};
export const Working: Story = { args: { pending: "approve" } };
export const Approved: Story = { args: { status: "approved", result: "Email sent at 09:41." } };
export const Rejected: Story = { args: { status: "rejected", result: "Nothing was sent." } };
export const LongContent: Story = {
  args: {
    title: "Overwrite the customer record with an extremely long identifier ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    details: <pre className="text-xs">{JSON.stringify({ customer: "Muster AG", changes: Array.from({ length: 14 }, (_, i) => `field_${i}: old -> new`) }, null, 2)}</pre>,
  },
};
const choices = [
  { id: "a", label: "Muster AG, Zürich", description: "Customer 10234 · last order 12.10.2026" },
  { id: "b", label: "Muster Bau AG, Bern", description: "Customer 10877 · last order 03.02.2026" },
  { id: "c", label: "Muster & Söhne GmbH" },
];
export const PickOne: Story = {
  args: { title: "Which customer do you mean?", description: undefined, details: undefined, choices },
  render: (args) => {
    const [picked, setPicked] = useState<string>();
    const status: ApprovalStatus = picked ? "approved" : "pending";
    return <ApprovalCard {...args} status={status} selectedChoiceId={picked} onChoose={setPicked} labels={{ approved: "Answered" }} />;
  },
};
export const PickOneAnswered: Story = { args: { title: "Which customer do you mean?", description: undefined, details: undefined, choices, status: "approved", selectedChoiceId: "b", labels: { approved: "Answered" } } };
export const GermanLabels: Story = {
  args: { title: "E-Mail senden", labels: { approve: "Genehmigen", reject: "Ablehnen", pending: "Freigabe nötig", approved: "Genehmigt", rejected: "Abgelehnt" } },
};
export const Interactive: Story = {
  render: (args) => {
    const [status, setStatus] = useState<ApprovalStatus>("pending");
    return <ApprovalCard {...args} status={status} onApprove={() => setStatus("approved")} onReject={() => setStatus("rejected")} />;
  },
};
