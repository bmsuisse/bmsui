import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Stepper } from "@bmsuisse/ui";

const steps = [
  { n: 1, label: "Type", phase: "Setup" },
  { n: 2, label: "Details", phase: "Setup" },
  { n: 3, label: "Pricing", phase: "Review" },
  { n: 4, label: "Confirm", phase: "Review" },
  { n: 5, label: "Done", phase: "Finish" },
];

const meta: Meta<typeof Stepper> = { title: "Patterns/Stepper", component: Stepper };

export default meta;
type Story = StoryObj<typeof Stepper>;

export const Default: Story = {
  render: () => {
    const [step, setStep] = useState(2);
    return <Stepper step={step} maxStep={3} onNavigate={setStep} steps={steps} />;
  },
};
export const WithStartOver: Story = {
  render: () => {
    const [step, setStep] = useState(3);
    return <Stepper step={step} maxStep={4} onNavigate={setStep} onNew={() => setStep(1)} newLabel="Start over" steps={steps} />;
  },
};
export const NoPhases: Story = {
  render: () => {
    const [step, setStep] = useState(1);
    return <Stepper step={step} maxStep={2} onNavigate={setStep} steps={steps.map(({ n, label }) => ({ n, label }))} />;
  },
};
export const NarrowWithMinWidth: Story = {
  render: () => {
    const [step, setStep] = useState(2);
    return <Stepper className="max-w-md" minWidth="48rem" step={step} maxStep={3} onNavigate={setStep} steps={steps} />;
  },
};
