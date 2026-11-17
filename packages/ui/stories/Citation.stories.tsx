import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Citation, SourceList, type CitationSource } from "@bmsuisse/ui";

const SOURCES: CitationSource[] = [
  { url: "https://www.bfs.admin.ch/bfs/de/home/statistiken.html", title: "Swiss Federal Statistical Office: Retail trade 2025" },
  { url: "https://example.com/report", title: "Annual report", domain: "example.com" },
  { url: "javascript:alert(1)", title: "Unsafe link is never rendered as a link" },
];

const meta: Meta<typeof Citation> = {
  title: "Patterns/Citation",
  component: Citation,
  args: { index: 1, source: SOURCES[0] },
};
const inSentence: Decorator = (Story) => (
  <p className="text-sm leading-6">
    Turnover grew by 4 %<Story />.
  </p>
);
export default meta;
type Story = StoryObj<typeof Citation>;

export const Default: Story = { decorators: [inSentence] };
export const UnknownSource: Story = { decorators: [inSentence], args: { source: undefined, index: 4 } };
export const UnsafeUrl: Story = { decorators: [inSentence], args: { source: SOURCES[2] } };

export const InText: Story = {
  render: () => (
    <p className="max-w-md text-sm leading-6">
      Retail turnover grew by 4 % last year<Citation index={1} source={SOURCES[0]} /> while online share reached a record
      high<Citation index={2} source={SOURCES[1]} />. One further claim lost its source<Citation index={3} />.
    </p>
  ),
};

export const WithSourceList: StoryObj<typeof SourceList> = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-sm leading-6">
        Turnover grew<Citation index={1} source={SOURCES[0]} /> and online share rose<Citation index={2} source={SOURCES[1]} />.
      </p>
      <SourceList sources={SOURCES.slice(0, 2)} />
    </div>
  ),
};

export const GermanLabels: Story = {
  decorators: [inSentence],
  args: { labels: { source: (n, title) => `Quelle ${n}: ${title}` } },
};
