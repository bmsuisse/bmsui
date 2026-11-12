import type { Meta, StoryObj } from "@storybook/react-vite";
import { Breadcrumbs, Button, PageHeader, Tabs, TabsList, TabsTrigger } from "@bmsuisse/ui";

const meta: Meta<typeof PageHeader> = {
  title: "Patterns/PageHeader",
  component: PageHeader,
  args: { title: "Customers", description: "All customers of your sales region." },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {};
export const WithActionsAndBadge: Story = { args: { badge: "beta", actions: <Button>New customer</Button> } };
export const WithBack: Story = { args: { title: "Acme AG", onBack: () => {}, badge: "dev" } };
export const Full: Story = {
  args: {
    title: "Acme AG",
    badge: "alpha",
    divider: true,
    breadcrumbs: <Breadcrumbs items={[{ label: "Home", href: "#" }, { label: "Customers", href: "#" }, { label: "Acme AG" }]} />,
    actions: <Button variant="outline">Edit</Button>,
    tabs: (
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
  },
};
