import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { BookOpenIcon, SparklesIcon } from "@heroicons/react/24/outline";
import {
  AiButton,
  AiExplainButton,
  Input,
  type SpeechRecognitionEngine,
  VoiceInputButton,
  VoiceTranscript,
} from "@bmsuisse/ui";

const meta: Meta = {
  title: "Patterns/Ai",
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Fake recognizer: shows interim words, then delivers one final phrase after ~1.5s. */
const fakeEngine = (): SpeechRecognitionEngine => {
  const e: SpeechRecognitionEngine = {
    lang: "",
    continuous: false,
    interimResults: true,
    onresult: null,
    onerror: null,
    onend: null,
    start() {
      setTimeout(() => e.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: false, 0: { transcript: "two extra pall" } } } }), 500);
      setTimeout(() => {
        e.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, 0: { transcript: "two extra pallets to the Sion site" } } } });
        e.onend?.();
      }, 1500);
    },
    stop() {
      e.onend?.();
    },
    abort() {
      e.onend = null;
    },
  };
  return e;
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <AiButton variant="ai">Generate</AiButton>
      <AiButton variant="ai-subtle" icon={SparklesIcon}>Rewrite</AiButton>
      <AiButton variant="ai-ghost" icon={BookOpenIcon}>Suggest tags</AiButton>
      <AiButton variant="ai" disabled>Disabled</AiButton>
    </div>
  ),
};

export const InFlight: Story = {
  render: () => {
    const [loading, setLoading] = useState(false);
    return (
      <div className="flex gap-3">
        <AiButton
          loading={loading}
          onClick={() => {
            setLoading(true);
            void sleep(1500).then(() => setLoading(false));
          }}
        >
          Summarize (click)
        </AiButton>
        <AiButton loading>Always loading</AiButton>
      </div>
    );
  },
};

export const ExplainButton: Story = {
  render: () => (
    <div className="flex items-center gap-4 rounded-xl border border-border p-4">
      <div>
        <p className="text-2xl font-semibold tabular-nums">CHF 2.4M</p>
        <p className="text-xs text-muted-foreground">Revenue, last 30 days</p>
      </div>
      <AiExplainButton
        title="Why is revenue up?"
        onExplain={async () => {
          await sleep(800);
          return <p>Revenue is 18% above the previous 30 days, driven by two Q4 framework renewals.</p>;
        }}
      />
    </div>
  ),
};

export const VoiceInput: Story = {
  render: () => {
    const [text, setText] = useState("");
    return (
      <div className="flex max-w-md items-center gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Customer note…" />
        <VoiceInputButton engine={fakeEngine} onTranscript={(t) => setText((v) => (v ? `${v} ${t}` : t))} />
      </div>
    );
  },
};

export const VoiceInputUnsupported: Story = {
  name: "Voice input (browser API, may be disabled)",
  render: () => <VoiceInputButton onTranscript={() => {}} />,
};

export const Transcript: Story = {
  render: () => {
    const [note, setNote] = useState("customer called about the insulation order they want two extra pallets");
    return (
      <div className="max-w-xl">
        <VoiceTranscript
          engine={fakeEngine}
          value={note}
          onChange={setNote}
          onTransform={async (t) => {
            await sleep(800);
            const c = t.trim();
            return `${c.charAt(0).toUpperCase()}${c.slice(1)}.`;
          }}
        />
      </div>
    );
  },
};
