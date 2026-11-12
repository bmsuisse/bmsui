import type { Meta, StoryObj } from "@storybook/react-vite";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@bmsuisse/ui";

const meta: Meta = {
  title: "Primitives/Tooltip",
  decorators: [(Story) => <TooltipProvider><div className="p-12"><Story /></div></TooltipProvider>],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger>
      <TooltipContent>Helpful hint</TooltipContent>
    </Tooltip>
  ),
};
export const Sides: Story = {
  render: () => (
    <div className="flex gap-3">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Tooltip key={side}>
          <TooltipTrigger asChild><Button variant="outline" size="sm">{side}</Button></TooltipTrigger>
          <TooltipContent side={side}>Tooltip {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
};
export const IconTrigger: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Info"><InformationCircleIcon /></Button>
      </TooltipTrigger>
      <TooltipContent>More information</TooltipContent>
    </Tooltip>
  ),
};
