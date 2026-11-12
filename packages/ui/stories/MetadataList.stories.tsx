import type { Meta, StoryObj } from "@storybook/react-vite";
import { MetadataList } from "@bmsuisse/ui";

const items = [
  { label: "Customer no.", value: "CH-100234", copyable: true },
  { label: "Name", value: "Acme AG" },
  { label: "City", value: "Zurich" },
  { label: "Phone", value: undefined },
  { label: "Notes", value: "Prefers delivery before 10:00.", fullWidth: true },
];

const meta: Meta<typeof MetadataList> = {
  title: "Patterns/MetadataList",
  component: MetadataList,
  args: { items },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof MetadataList>;

export const Default: Story = {};
export const Horizontal: Story = { args: { layout: "horizontal", divided: true } };
export const TwoColumns: Story = { args: { columns: 2 } };
export const AllCopyable: Story = { args: { copyable: true } };
