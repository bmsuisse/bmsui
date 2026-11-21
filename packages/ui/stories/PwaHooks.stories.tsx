import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, captureInstallPrompt, useInstallPrompt, useServiceWorkerUpdate, useStandaloneMode } from "@bmsuisse/ui";

const meta: Meta = { title: "Hooks/PWA" };
export default meta;
type Story = StoryObj;

/** `useServiceWorkerUpdate`: headless; the caller passes the service-worker state. */
export const ServiceWorkerUpdate: Story = {
  render: () => {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [dirty, setDirty] = useState(false);
    const sw = useServiceWorkerUpdate({ needRefresh, onUpdate: () => new Promise<void>(() => {}), canReload: () => !dirty, snoozeMs: 5000 });
    return (
      <div className="flex max-w-md flex-col gap-3 text-sm">
        <p>Status: <code>{sw.status}</code></p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setNeedRefresh((value) => !value)}>Worker {needRefresh ? "clears" : "waits"}</Button>
          <Button size="sm" variant="outline" onClick={() => setDirty((value) => !value)}>Unsaved work: {dirty ? "yes" : "no"}</Button>
          <Button size="sm" onClick={sw.update}>update()</Button>
          <Button size="sm" variant="ghost" onClick={sw.snooze}>snooze() 5 s</Button>
        </div>
      </div>
    );
  },
};

/** `useInstallPrompt`: press the button to dispatch a fake `beforeinstallprompt`, as Chrome would. */
export const InstallPromptState: Story = {
  render: () => {
    captureInstallPrompt();
    const install = useInstallPrompt({ storageKey: "bmsui:storybook-install" });
    const [log, setLog] = useState("");
    const simulate = (): void => {
      window.dispatchEvent(
        Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: "accepted" as const }),
        }),
      );
    };
    return (
      <div className="flex max-w-md flex-col gap-3 text-sm">
        <p>platform <code>{install.platform}</code> · canInstall <code>{String(install.canInstall)}</code> · installed <code>{String(install.installed)}</code> · dismissed <code>{String(install.dismissed)}</code></p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={simulate}>Simulate beforeinstallprompt</Button>
          <Button size="sm" onClick={async () => setLog(await install.promptInstall())}>promptInstall()</Button>
          <Button size="sm" variant="ghost" onClick={install.dismiss}>dismiss()</Button>
        </div>
        {log ? <p>Last outcome: <code>{log}</code></p> : null}
      </div>
    );
  },
};

/** `useStandaloneMode`: `true` once the app was installed and opened from the home screen. */
export const StandaloneMode: Story = {
  render: () => {
    const standalone = useStandaloneMode();
    return <p className="text-sm">{standalone ? "Running installed (standalone)." : "Running in a browser tab."}</p>;
  },
};
