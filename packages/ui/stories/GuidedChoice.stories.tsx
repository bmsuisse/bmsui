import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, GuidedChoice, type GuidedChoiceOption } from "@bmsuisse/ui";

const product = (id: string, sgvsb: string, price: string, why: string) => (
  <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs">
    <dt>Article</dt>
    <dd className="tabular-nums">{id}</dd>
    <dt>SGVSB</dt>
    <dd className="tabular-nums">{sgvsb}</dd>
    <dt>Price</dt>
    <dd className="tabular-nums">{price}</dd>
    <dt>Why</dt>
    <dd>{why}</dd>
  </dl>
);

type Step = { line: string; options: GuidedChoiceOption[] };

const flush: Step = {
    line: "Pos. 10 · 24 Stk · Geberit Spülkasten Sigma 12 cm UP320 · 111.300.00.5",
    options: [
      { value: "4711", label: "Geberit Sigma UP-Spülkasten 12 cm UP320", suggested: true, content: product("4711", "111.300.00.5", "CHF 312.00", "Same Geberit number") },
      { value: "4712", label: "Geberit Sigma UP-Spülkasten 8 cm UP720", content: product("4712", "109.791.00.1", "CHF 398.00", "Same series, 8 cm") },
      { value: "4713", label: "Geberit Omega UP-Spülkasten 12 cm", content: product("4713", "109.060.00.1", "CHF 289.00", "Same depth, other series") },
    ],
};

const plate: Step = {
    line: "Pos. 20 · 6 Stk · Betätigungsplatte Sigma01 weiss",
    options: [
      { value: "5101", label: "Geberit Betätigungsplatte Sigma01 weiss-alpin", suggested: true, content: product("5101", "115.770.11.5", "CHF 74.50", "Name and colour") },
      { value: "5102", label: "Geberit Betätigungsplatte Sigma01 chrom", content: product("5102", "115.770.21.5", "CHF 98.00", "Other colour") },
      { value: "5103", label: "Geberit Betätigungsplatte Sigma20 weiss", disabled: true, content: product("5103", "115.882.KJ.1", "CHF 129.00", "No longer sold") },
    ],
};

const frame: Step = {
    line: "Pos. 30 · 2 Stk · Montageelement für WC 112 cm",
    options: [
      { value: "6201", label: "Geberit Duofix WC-Element 112 cm UP320", content: product("6201", "111.300.00.5", "CHF 455.00", "Height matches") },
      { value: "6202", label: "Geberit Duofix WC-Element 98 cm", content: product("6202", "111.350.00.5", "CHF 430.00", "Same series") },
    ],
};

const steps = [flush, plate, frame];

const meta: Meta<typeof GuidedChoice> = {
  title: "Patterns/GuidedChoice",
  component: GuidedChoice,
  args: {
    title: "Which product is it?",
    question: flush.line,
    options: flush.options,
    onConfirm: () => undefined,
  },
  decorators: [(Story) => <div className="w-[48rem] max-w-full"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof GuidedChoice>;

export const Suggested: Story = {};
export const NothingSuggested: Story = { args: { question: frame.line, options: frame.options } };
export const Working: Story = { args: { pending: true } };
export const Narrow: Story = { decorators: [(Story) => <div className="w-80"><Story /></div>] };

/** The whole review: confirm (Enter) moves to the next line; 1-9 or arrows change the pick. */
export const ProductReview: Story = {
  render: () => {
    const [index, setIndex] = useState(0);
    const [picked, setPicked] = useState<string[]>([]);
    const next = (value: string) => {
      setPicked((all) => [...all, value]);
      setIndex((i) => i + 1);
    };
    const step = steps[index];
    if (!step) {
      return (
        <div className="grid gap-2 text-sm">
          <p className="font-semibold">All {steps.length} lines reviewed</p>
          <p className="text-muted-foreground">Picked: {picked.join(", ")}</p>
          <Button size="sm" variant="outline" className="w-fit" onClick={() => { setIndex(0); setPicked([]); }}>
            Start over
          </Button>
        </div>
      );
    }
    return (
      <GuidedChoice
        key={index}
        title={`Line ${index + 1} of ${steps.length}: which product is it?`}
        question={step.line}
        options={step.options}
        onConfirm={next}
        actions={
          <Button type="button" size="sm" variant="ghost" onClick={() => next("one-time")}>
            Keep as one-time article
          </Button>
        }
      />
    );
  },
};
