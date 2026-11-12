import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RankBadge, ResultCard, ResultList, ScoreBadge, Thumbnail } from "@bmsuisse/ui";

const items = [
  { id: "1", title: "Cordless drill 18V", meta: "Art. 100234 · Acme AG", price: "CHF 129.90", score: 96 },
  { id: "2", title: "Impact driver 12V", meta: "Art. 100871 · Bolt GmbH", price: "CHF 89.00", score: 81 },
  { id: "3", title: "Hammer drill SDS+", meta: "Art. 102003 · Acme AG", price: "CHF 249.00", score: 64 },
];

const meta = {
  title: "Patterns/ResultCard",
  component: ResultCard,
  parameters: { layout: "padded" },
  args: { title: "Cordless drill 18V" },
} satisfies Meta<typeof ResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ProductList: Story = {
  render: () => {
    const [selected, setSelected] = useState("1");
    return (
      <ResultList aria-label="Search results" className="w-[28rem]">
        {items.map((item, index) => (
          <ResultCard
            key={item.id}
            title={item.title}
            meta={item.meta}
            leading={
              <span className="flex items-center gap-2">
                <RankBadge rank={index + 1} />
                <Thumbnail src={index === 1 ? "broken.png" : null} />
              </span>
            }
            trailing={
              <span className="flex flex-col items-end gap-1">
                <span className="font-medium text-sm tabular-nums">{item.price}</span>
                <ScoreBadge value={item.score} size="sm" />
              </span>
            }
            selected={selected === item.id}
            onSelect={() => setSelected(item.id)}
          />
        ))}
      </ResultList>
    );
  },
};

export const Disabled: Story = { args: { disabled: true, meta: "Not available" }, decorators: [(Story) => <ResultList aria-label="r" className="w-96"><Story /></ResultList>] };
