import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, HoverCard, HoverCardContent, HoverCardTrigger } from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/HoverCard" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild><Button variant="link">@customer-42</Button></HoverCardTrigger>
      <HoverCardContent className="w-64 text-sm">
        <p className="font-medium">Muster AG</p>
        <p className="text-muted-foreground">Zurich, 12 open offers.</p>
      </HoverCardContent>
    </HoverCard>
  ),
};
export const Wide: Story = {
  render: () => (
    <HoverCard openDelay={0}>
      <HoverCardTrigger asChild><Button variant="outline">Hover me</Button></HoverCardTrigger>
      <HoverCardContent className="w-96 text-sm text-muted-foreground">Opens immediately and is wider.</HoverCardContent>
    </HoverCard>
  ),
};
