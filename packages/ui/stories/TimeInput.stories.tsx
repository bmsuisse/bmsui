import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FormField, TimeInput } from "@bmsuisse/ui";

const meta: Meta<typeof TimeInput> = {
  title: "Patterns/TimeInput",
  component: TimeInput,
  args: { value: "09:30", onValueChange: () => {}, "aria-label": "Start time" },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div className="w-40 max-w-full">
        <TimeInput {...args} value={value} onValueChange={setValue} />
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { value: "" } };
export const WithMinMax: Story = { args: { value: "", min: "08:00", max: "18:00" }, parameters: { docs: { description: { story: "Type `19:00` and leave the field: out of range." } } } };
export const Step15: Story = { args: { step: 15 }, parameters: { docs: { description: { story: "ArrowUp/ArrowDown move by 15 minutes, PageUp/PageDown by an hour." } } } };
export const TwelveHour: Story = { args: { locale: "en-US", value: "14:30" } };
export const NativeControl: Story = { args: { native: "always" }, parameters: { docs: { description: { story: "What touch devices get with `native=\"auto\"`." } } } };
export const Disabled: Story = { args: { disabled: true } };
export const ReadOnly: Story = {
  args: { readOnly: true },
  parameters: { docs: { description: { story: "Read-only has no visual cue (same as DateInput and NumberInput): the value just cannot be edited." } } },
};
export const Invalid: Story = { args: { value: "09:30", "aria-invalid": true } };
export const German: Story = {
  args: { value: "14:30", locale: "de-CH", labels: { invalid: "Bitte eine gültige Uhrzeit eingeben", outOfRange: "Uhrzeit ausserhalb des Bereichs" }, min: "08:00" },
};
export const InFormField: Story = {
  render: (args) => {
    const [value, setValue] = useState("");
    return (
      <div className="w-56 max-w-full">
        <FormField label="Pick-up time" description="Local time, 24 h">
          <TimeInput {...args} aria-label={undefined} value={value} onValueChange={setValue} />
        </FormField>
      </div>
    );
  },
};
