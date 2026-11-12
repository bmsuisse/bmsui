import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Input, useLocalStorageState } from "@bmsuisse/ui";

const meta: Meta = { title: "Hooks/useLocalStorageState", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [name, setName, remove] = useLocalStorageState("storybook-name", "");
    return (
      <div className="flex max-w-sm flex-col gap-2 text-sm">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type, then reload the page" />
        <p className="text-muted-foreground">Stored value: {JSON.stringify(name)}</p>
        <Button size="sm" variant="outline" onClick={remove} className="w-fit">Remove</Button>
      </div>
    );
  },
};

export const SyncedInstances: Story = {
  render: () => {
    const Counter = () => {
      const [n, setN] = useLocalStorageState("storybook-counter", 0);
      return <Button variant="outline" onClick={() => setN(n + 1)}>Count: {n}</Button>;
    };
    return (
      <div className="flex gap-3">
        <Counter />
        <Counter />
      </div>
    );
  },
};
