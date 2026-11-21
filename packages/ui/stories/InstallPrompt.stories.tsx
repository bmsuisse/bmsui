import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BmsLocaleProvider, InstallPrompt } from "@bmsuisse/ui";

const meta: Meta<typeof InstallPrompt> = {
  title: "Patterns/InstallPrompt",
  component: InstallPrompt,
  // `platform` and `open` are forced so the stories look the same in every browser; a real app leaves both out.
  args: { appName: "OneSales", platform: "native", open: true, position: "static" },
  decorators: [(Story) => <div className="max-w-sm p-4"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof InstallPrompt>;

/** Chrome, Edge, Android: Install opens the browser's own dialog. */
export const Native: Story = {};

/** Safari on iPhone/iPad: no install API, so Install opens a short "Add to Home Screen" guide. */
export const Ios: Story = { args: { platform: "ios" } };

/** The guide itself, opened for the story (a bottom sheet on phones). */
export const IosGuide: Story = {
  tags: ["no-visual"],
  args: { platform: "ios" },
  render: (args) => {
    useEffect(() => {
      document.querySelector<HTMLButtonElement>("[data-testid='install-ios'] button")?.click();
    }, []);
    return <InstallPrompt {...args} data-testid="install-ios" />;
  },
};

export const CustomIconAndText: Story = {
  args: {
    icon: <span className="text-sm font-bold">1S</span>,
    description: "Works offline and opens in its own window.",
  },
};

/** A bar in the app shell instead of a card. */
export const Banner: Story = {
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="w-full"><Story /></div>],
  args: { variant: "banner" },
};

/** `position="fixed"` (the default) pins the card bottom-right on desktop, full width on phones, above the safe-area inset. */
export const Floating: Story = {
  parameters: { layout: "fullscreen" },
  args: { position: "fixed" },
  decorators: [(Story) => <div className="h-72 w-full"><Story /></div>],
};

/** Where installing is impossible (or the app already runs installed) nothing is rendered. */
export const NotInstallable: Story = {
  args: { platform: "none" },
  render: (args) => (
    <div className="text-sm text-muted-foreground">
      <InstallPrompt {...args} />
      Nothing renders here: platform is <code>none</code>.
    </div>
  ),
};

export const German: Story = {
  render: (args) => (
    <BmsLocaleProvider locale="de-CH">
      <InstallPrompt {...args} />
    </BmsLocaleProvider>
  ),
};
