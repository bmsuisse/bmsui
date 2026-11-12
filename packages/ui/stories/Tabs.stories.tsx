import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/Tabs" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [tab, setTab] = useState("one");
    return (
      <Tabs value={tab} onValueChange={setTab} className="w-80">
        <TabsList>
          <TabsTrigger value="one">Overview</TabsTrigger>
          <TabsTrigger value="two">Items</TabsTrigger>
          <TabsTrigger value="three">History</TabsTrigger>
        </TabsList>
        <TabsContent value="one" className="text-sm text-muted-foreground">Overview content.</TabsContent>
        <TabsContent value="two" className="text-sm text-muted-foreground">Items content.</TabsContent>
        <TabsContent value="three" className="text-sm text-muted-foreground">History content.</TabsContent>
      </Tabs>
    );
  },
};
export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="a" className="w-80">
      <TabsList>
        <TabsTrigger value="a">Active</TabsTrigger>
        <TabsTrigger value="b" disabled>Disabled</TabsTrigger>
      </TabsList>
      <TabsContent value="a" className="text-sm text-muted-foreground">Only this tab is available.</TabsContent>
    </Tabs>
  ),
};
