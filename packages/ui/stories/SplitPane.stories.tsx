import type { Meta, StoryObj } from "@storybook/react-vite";
import { SplitPane, SplitPanePanel } from "@bmsuisse/ui";

const meta: Meta<typeof SplitPane> = {
  title: "Patterns/SplitPane",
  component: SplitPane,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof meta>;

const frame = "h-72 w-full overflow-hidden rounded-xl border border-border bg-background";
const names = ["Müller Haustechnik AG", "Baumann Sanitär GmbH", "Graf Bad & Küche", "Steiner Bau AG"];

export const Horizontal: Story = {
  render: () => (
    <div className={frame}>
      <SplitPane defaultSizes={[32, 68]}>
        <SplitPanePanel minSize="160px" maxSize={60} className="flex flex-col gap-1 p-2">
          {names.map((n, i) => (
            <div key={n} className={i === 0 ? "rounded-md bg-foreground/[0.06] px-2.5 py-1.5 text-sm font-medium" : "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground"}>
              {n}
            </div>
          ))}
        </SplitPanePanel>
        <SplitPanePanel minSize="240px" className="p-4 text-sm text-muted-foreground">
          Drag the separator, or focus it and use the arrow keys. Double-click resets.
        </SplitPanePanel>
      </SplitPane>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className={frame}>
      <SplitPane direction="vertical" defaultSizes={[60, 40]}>
        <div className="p-4 text-sm">Editor</div>
        <div className="h-full bg-muted/50 p-4 font-mono text-xs text-muted-foreground">$ build output…</div>
      </SplitPane>
    </div>
  ),
};

export const ThreePanes: Story = {
  render: () => (
    <div className={frame}>
      <SplitPane defaultSizes={[20, 50, 30]}>
        <div className="p-3 text-sm">Navigation</div>
        <div className="p-3 text-sm">Content</div>
        <div className="p-3 text-sm">Inspector</div>
      </SplitPane>
    </div>
  ),
};

export const Persisted: Story = {
  render: () => (
    <div className={frame}>
      <SplitPane defaultSizes={[50, 50]} storageKey="storybook-split-pane">
        <div className="p-3 text-sm">Left (size remembered in localStorage)</div>
        <div className="p-3 text-sm">Right</div>
      </SplitPane>
    </div>
  ),
};
