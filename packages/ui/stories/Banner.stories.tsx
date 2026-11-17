import { useState } from "react";
import { ArrowPathIcon, EyeIcon, ExclamationTriangleIcon, InformationCircleIcon, SignalSlashIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Banner, BannerAction, Button, useOnlineStatus } from "@bmsuisse/ui";

const meta: Meta<typeof Banner> = {
  title: "Patterns/Banner",
  component: Banner,
  args: { children: "You are offline. What is on screen still works, but nothing new loads or saves.", icon: <SignalSlashIcon /> },
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const Default: Story = {};
export const Tones: Story = {
  render: () => (
    <div className="flex flex-col">
      <Banner tone="neutral" icon={<SignalSlashIcon />}>Neutral: you are offline.</Banner>
      <Banner tone="info" icon={<InformationCircleIcon />}>Info: beta feature, feedback welcome.</Banner>
      <Banner tone="warning" icon={<EyeIcon />}>
        Warning: you are testing as <strong>maria.keller</strong> · expires at 14:30
      </Banner>
      <Banner tone="brand" icon={<ArrowPathIcon />}>Brand: a new version is available.</Banner>
      <Banner tone="danger" role="alert" icon={<ExclamationTriangleIcon />}>
        DANGER: TEST ENVIRONMENT. Changes do not reach real data.
      </Banner>
    </div>
  ),
};
export const WithActions: Story = {
  render: () => (
    <div className="flex flex-col">
      <Banner tone="brand" icon={<ArrowPathIcon />} actions={<BannerAction><ArrowPathIcon aria-hidden="true" />Reload</BannerAction>} onDismiss={() => {}}>
        A new version is available.
      </Banner>
      <Banner tone="warning" icon={<EyeIcon />} actions={<BannerAction>Stop</BannerAction>}>
        You are testing as a very long user name that wraps onto several lines on a phone, to check balancing
      </Banner>
      <Banner tone="danger" role="alert" actions={<BannerAction>Reload</BannerAction>}>
        Your session expired.
      </Banner>
    </div>
  ),
};
export const Dismissible: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div className="flex flex-col gap-3">
        <Banner tone="info" open={open} onDismiss={() => setOpen(false)} labels={{ dismiss: "Schliessen" }}>
          Beta: this page is still changing.
        </Banner>
        <div className="px-4">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Show again</Button>
        </div>
      </div>
    );
  },
};
export const OfflineWithHook: Story = {
  render: () => {
    const online = useOnlineStatus();
    return (
      <div className="flex flex-col gap-3">
        <Banner open={!online} icon={<SignalSlashIcon />}>You are offline.</Banner>
        <p className="px-4 text-sm text-muted-foreground">Status: {online ? "online" : "offline"}. Toggle the network in dev tools.</p>
        <p className="px-4 text-sm text-muted-foreground">The offline state, always shown:</p>
        <Banner open icon={<SignalSlashIcon />}>You are offline.</Banner>
      </div>
    );
  },
};
