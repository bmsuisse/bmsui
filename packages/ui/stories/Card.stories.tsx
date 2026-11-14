import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/Card" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Card className="w-80 max-w-full">
      <CardHeader>
        <CardTitle>Offer 4711</CardTitle>
        <CardDescription>Created yesterday</CardDescription>
      </CardHeader>
      <CardContent>Three line items, total CHF{"\u00a0"}1'240.00.</CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Open</Button>
        <Button size="sm" variant="outline">Archive</Button>
      </CardFooter>
    </Card>
  ),
};
export const ContentOnly: Story = {
  render: () => (
    <Card className="w-80 max-w-full">
      <CardContent className="pt-6 text-sm text-muted-foreground">A card with just content.</CardContent>
    </Card>
  ),
};
