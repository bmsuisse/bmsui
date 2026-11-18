import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmailAddressInput, FormField } from "@bmsuisse/ui";

const meta: Meta<typeof EmailAddressInput> = {
  title: "Patterns/EmailAddressInput",
  component: EmailAddressInput,
  decorators: [(Story) => <div className="max-w-full w-[28rem]"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof EmailAddressInput>;

function Field(props: Partial<React.ComponentProps<typeof EmailAddressInput>> & { label?: string; initial?: string[] }) {
  const { label = "An", initial = [], ...rest } = props;
  const [value, setValue] = useState<string[]>(initial);
  return (
    <FormField label={label}>
      <EmailAddressInput {...rest} value={value} onValueChange={setValue} />
    </FormField>
  );
}

export const Default: Story = { render: () => <Field /> };

export const WithAddresses: Story = {
  render: () => <Field initial={["verkauf@muster-ag.ch", "anna.keller@keller-haustechnik.ch", "einkauf@muster-ag.ch"]} />,
};

export const InvalidAddress: Story = {
  render: () => <Field initial={["verkauf@muster-ag.ch", "keller@haustechnik"]} />,
};

export const ExternalError: Story = {
  render: () => <Field initial={["verkauf@muster-ag.ch"]} error="Mindestens ein Empfänger ist erforderlich." />,
};

export const WithSuggestions: Story = {
  render: () => (
    <Field
      suggestions={[
        { email: "anna.keller@keller-haustechnik.ch", name: "Anna Keller" },
        { email: "bruno.keller@keller-haustechnik.ch", name: "Bruno Keller" },
        { email: "verkauf@muster-ag.ch", name: "Verkauf Muster AG" },
        { email: "einkauf@muster-ag.ch" },
      ]}
    />
  ),
};

export const MaxItems: Story = {
  render: () => <Field maxItems={2} initial={["verkauf@muster-ag.ch", "einkauf@muster-ag.ch"]} />,
};

export const Disabled: Story = {
  render: () => <Field disabled initial={["verkauf@muster-ag.ch"]} />,
};

export const German: Story = {
  render: () => (
    <Field
      label="Kopie (Cc)"
      initial={["verkauf@muster-ag.ch", "keller@haustechnik"]}
      labels={{
        remove: (email) => `${email} entfernen`,
        placeholder: "Adresse hinzufügen…",
        invalidAddress: "Bitte markierte Adressen prüfen.",
        maxReached: (max) => `Höchstens ${max} Adressen.`,
      }}
    />
  ),
};
