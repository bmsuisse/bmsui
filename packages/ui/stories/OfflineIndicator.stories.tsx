import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BmsLocaleProvider, Button, OfflineIndicator, Toaster, resetToasts } from "@bmsuisse/ui";

const meta: Meta<typeof OfflineIndicator> = {
  title: "Patterns/OfflineIndicator",
  component: OfflineIndicator,
  args: { online: false },
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof OfflineIndicator>;

/** Offline, forced with `online={false}`. */
export const Offline: Story = {};

/** `online` is controlled here; a real app leaves it out and the browser's `online`/`offline` events drive it. */
export const BackOnlineToast: Story = {
  tags: ["no-visual"],
  render: (args) => {
    const [online, setOnline] = useState(false);
    return (
      <div className="flex flex-col gap-3">
        <Toaster />
        <OfflineIndicator {...args} online={online} />
        <div className="flex gap-2 px-4">
          <Button variant="outline" onClick={() => setOnline((value) => !value)}>{online ? "Go offline" : "Come back online"}</Button>
          <Button variant="ghost" onClick={resetToasts}>Clear toasts</Button>
        </div>
      </div>
    );
  },
};

export const WithoutToast: Story = { args: { backOnlineToast: false } };

export const German: Story = {
  render: (args) => (
    <BmsLocaleProvider locale="de-CH">
      <OfflineIndicator {...args} />
    </BmsLocaleProvider>
  ),
};
