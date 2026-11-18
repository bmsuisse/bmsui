import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowPathIcon, CheckCircleIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { MailEvent } from "@bmsuisse/ui";

const T = "2026-11-17T09:41:00";

const meta: Meta<typeof MailEvent> = {
  title: "Patterns/MailEvent",
  component: MailEvent,
  decorators: [(Story) => <ul className="w-[34rem] max-w-full"><Story /></ul>],
};
export default meta;
type Story = StoryObj<typeof MailEvent>;

export const Default: Story = { args: { children: "Anna Keller assigned this to Bob Muster", icon: UserPlusIcon, time: T } };
export const Success: Story = { args: { children: "Status changed to Closed", icon: CheckCircleIcon, tone: "success", time: T } };
export const Warning: Story = { args: { children: "Customer has not replied for 3 days", tone: "warning" } };
export const Danger: Story = { args: { children: "Delivery to verkauf@muster-ag.ch failed", tone: "danger", time: T } };
export const LongText: Story = {
  args: { children: "Konversation wurde von keller.haustechnik.sehr.lange.adresse@muster-ag.example.ch zusammengeführt", time: T },
};
export const Series: Story = {
  render: () => (
    <>
      <MailEvent icon={UserPlusIcon} time={T}>Anna assigned this to Bob</MailEvent>
      <MailEvent icon={ArrowPathIcon} time={T}>Status changed to Pending</MailEvent>
      <MailEvent icon={CheckCircleIcon} tone="success" time={T}>Status changed to Closed</MailEvent>
    </>
  ),
};
