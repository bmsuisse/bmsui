import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BmsLocaleProvider, Button, Toaster, UpdatePrompt, resetToasts } from "@bmsuisse/ui";

const meta: Meta<typeof UpdatePrompt> = {
  title: "Patterns/UpdatePrompt",
  component: UpdatePrompt,
  args: { needRefresh: true, onUpdate: () => {} },
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof UpdatePrompt>;

/** A new service worker is waiting. Reload activates it; Later hides the bar for `snoozeMs`. */
export const Available: Story = {};

/** After the click, until the page reloads. `onUpdate` here never settles. */
export const Updating: Story = {
  render: (args) => {
    const [clicked, setClicked] = useState(false);
    return (
      <div className="flex flex-col gap-3">
        <UpdatePrompt {...args} onUpdate={() => { setClicked(true); return new Promise<void>(() => {}); }} />
        <p className="px-4 text-sm text-muted-foreground">{clicked ? "Updating… (the real page would reload now)" : "Click Reload."}</p>
      </div>
    );
  },
};

/** `canReload` returns `false` while a form has unsaved changes: the bar asks to save first instead of discarding them. */
export const BlockedByUnsavedWork: Story = {
  render: (args) => {
    const [dirty, setDirty] = useState(true);
    return (
      <div className="flex flex-col gap-3">
        <UpdatePrompt {...args} canReload={() => !dirty} />
        <label className="flex items-center gap-2 px-4 text-sm">
          <input type="checkbox" checked={dirty} onChange={(event) => setDirty(event.target.checked)} />
          Form has unsaved changes. Click Reload, then untick this and click Reload again.
        </label>
      </div>
    );
  },
};

/** No "Later": for a version that must not keep running. */
export const NotDismissible: Story = { args: { dismissible: false } };

/** First-time caching finished: one toast ("Ready to work offline."). Needs a `<Toaster />` in the app. */
export const OfflineReady: Story = {
  tags: ["no-visual"],
  render: (args) => {
    const [ready, setReady] = useState(false);
    useEffect(() => resetToasts, []);
    return (
      <div className="flex flex-col gap-3 p-4">
        <Toaster />
        <UpdatePrompt {...args} needRefresh={false} offlineReady={ready} onOfflineReadyShown={() => setReady(false)} />
        <div><Button variant="outline" onClick={() => setReady(true)}>Cache finished</Button></div>
      </div>
    );
  },
};

/** Other tones, e.g. `info` for a quieter shell. */
export const Tones: Story = {
  render: (args) => (
    <div className="flex flex-col">
      <UpdatePrompt {...args} tone="neutral" />
      <UpdatePrompt {...args} tone="info" />
      <UpdatePrompt {...args} tone="warning" />
    </div>
  ),
};

/** Texts come from `<BmsLocaleProvider>`; `labels` overrides single ones. */
export const German: Story = {
  render: (args) => (
    <BmsLocaleProvider locale="de-CH">
      <UpdatePrompt {...args} />
    </BmsLocaleProvider>
  ),
};

export const LabelsOverride: Story = {
  args: { labels: { message: "OneSales wurde aktualisiert.", update: "Jetzt neu laden", later: "Spaeter" } },
};

/** Narrow screens: the message wraps and the buttons grow to 44px. */
export const Phone: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => (
    <div className="max-w-[360px]">
      <UpdatePrompt {...args} />
    </div>
  ),
};
