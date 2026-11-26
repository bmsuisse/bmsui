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
      <Tabs value={tab} onValueChange={setTab} className="w-80 max-w-full">
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
    <Tabs defaultValue="a" className="w-80 max-w-full">
      <TabsList>
        <TabsTrigger value="a">Active</TabsTrigger>
        <TabsTrigger value="b" disabled>Disabled</TabsTrigger>
      </TabsList>
      <TabsContent value="a" className="text-sm text-muted-foreground">Only this tab is available.</TabsContent>
    </Tabs>
  ),
};

export const Underline: Story = {
  render: () => {
    const [tab, setTab] = useState("details");
    return (
      <Tabs value={tab} onValueChange={setTab} variant="underline" className="w-[32rem] max-w-full">
        <TabsList aria-label="Offer sections">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="sub" count={4}>Sub-offers</TabsTrigger>
          <TabsTrigger value="addresses" count={12}>Addresses</TabsTrigger>
          <TabsTrigger value="lines" disabled>Lines</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="pt-4 text-sm text-muted-foreground">Details content.</TabsContent>
        <TabsContent value="sub" className="pt-4 text-sm text-muted-foreground">Four sub-offers.</TabsContent>
        <TabsContent value="addresses" className="pt-4 text-sm text-muted-foreground">Twelve addresses.</TabsContent>
      </Tabs>
    );
  },
};
/** Too many tabs for the width: the list scrolls sideways instead of wrapping. */
export const UnderlineScrolls: Story = {
  render: () => (
    <Tabs defaultValue="overview" variant="underline" className="w-72 max-w-full">
      <TabsList aria-label="Customer sections">
        {["Overview", "Portfolio", "Customers", "Map", "Activity", "One on one"].map((label) => (
          <TabsTrigger key={label} value={label.toLowerCase().replace(" ", "-")}>{label}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  ),
};

export const Chips: Story = {
  render: () => {
    const [lane, setLane] = useState("all");
    return (
      <Tabs value={lane} onValueChange={setLane} variant="chips" className="w-96 max-w-full">
        <TabsList aria-label="Lanes">
          <TabsTrigger value="all" count={24}>All</TabsTrigger>
          <TabsTrigger value="open" count={9}>Open</TabsTrigger>
          <TabsTrigger value="overdue" count={3} countTone="danger">Overdue</TabsTrigger>
          <TabsTrigger value="risks" count={2} countTone="warning">Risks</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
        </TabsList>
      </Tabs>
    );
  },
};

export const OverflowMenu: Story = {
  render: () => {
    const [tab, setTab] = useState("t0");
    return (
      <Tabs value={tab} onValueChange={setTab} variant="underline" overflow="menu" className="w-96 max-w-full">
        <TabsList aria-label="Sections">
          {Array.from({ length: 8 }, (_, i) => (
            <TabsTrigger key={i} value={`t${i}`} count={i === 4 ? 3 : undefined}>Section {i + 1}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    );
  },
};
