import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Combobox } from "@bmsuisse/ui";

const options = ["Acme AG", "Bolt GmbH", "Cobalt SA", "Delta Tools", "Echo Supplies"].map((label) => ({
  value: label.toLowerCase().replace(/\s+/g, "-"),
  label,
}));

const meta = {
  title: "Patterns/Combobox",
  component: Combobox,
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Single: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <div className="w-64 max-w-full">
        <Combobox options={options} value={value} onChange={setValue} placeholder="Supplier" />
      </div>
    );
  },
};

export const Multiple: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["acme-ag"]);
    return (
      <div className="w-64 max-w-full">
        <Combobox multiple options={options} value={value} onChange={setValue} placeholder="Suppliers" />
      </div>
    );
  },
};

export const LongLabelsFitContent: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <div className="w-64 max-w-full">
        <Combobox
          fitContent
          options={[
            { value: "1", label: "100234 Muster Holzbau und Innenausbau Aktiengesellschaft Zweigniederlassung Zuerich-Oerlikon" },
            { value: "2", label: "100235 Beispiel AG" },
          ]}
          value={value}
          onChange={setValue}
          placeholder="Template customer"
        />
      </div>
    );
  },
};
