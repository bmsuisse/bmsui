import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FormField, formatSwissPhone, normalizePhone, PhoneInput } from "@bmsuisse/ui";

const meta: Meta<typeof PhoneInput> = {
  title: "Patterns/PhoneInput",
  component: PhoneInput,
  args: { "aria-label": "Mobile" },
  render: (args) => {
    const [value, setValue] = useState(args.value ?? "");
    return (
      <div className="w-64 max-w-full">
        <PhoneInput {...args} value={value} onValueChange={setValue} />
        <p className="mt-2 text-xs text-muted-foreground">Leave the field to normalise Swiss numbers.</p>
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SwissNational: Story = { args: { value: "0791234567" } };
export const International0041: Story = { args: { value: "0041791234567" } };
export const NonSwissStaysAsTyped: Story = { args: { value: "+49 171 1234567" } };
export const Disabled: Story = { args: { value: "+41 79 123 45 67", disabled: true } };
export const NormalizeOff: Story = { args: { value: "0791234567", normalize: (v: string) => v } };
export const Invalid: Story = { args: { value: "079 123", "aria-invalid": true } };
export const InFormField: Story = {
  render: () => {
    const [value, setValue] = useState("079 123");
    const bad = !/^\+41 \d\d \d{3} \d\d \d\d$/.test(normalizePhone(value));
    return (
      <div className="w-72 max-w-full">
        <FormField label="Mobile" description="Swiss numbers are formatted automatically" error={bad ? "Enter a complete Swiss number" : undefined}>
          <PhoneInput value={value} onValueChange={setValue} />
        </FormField>
      </div>
    );
  },
};
export const Helpers: Story = {
  render: () => (
    <ul className="space-y-1 font-mono text-sm">
      {["079 123 45 67", "0041 79 123 45 67", "+41 (0)79 123 45 67", "+49 30 123456"].map((v) => (
        <li key={v}>
          {v} → {formatSwissPhone(v)}
        </li>
      ))}
    </ul>
  ),
};
