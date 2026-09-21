import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiButton } from "../../../src/patterns/ai/AiButton";
import { AiExplainButton } from "../../../src/patterns/ai/AiExplainButton";
import { VoiceInputButton } from "../../../src/patterns/ai/VoiceInputButton";
import { VoiceTranscript } from "../../../src/patterns/ai/VoiceTranscript";
import { describeSpeechError } from "../../../src/patterns/ai/useSpeechRecognition";

// jsdom has no Web Speech API, so the tests that need one install this fake
// and drive it by hand. `instances` lets a test reach the recognizer the
// component constructed and fire results/errors at it.
const instances: FakeRecognition[] = [];
class FakeRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  started = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    instances.push(this);
  }
  start(): void {
    this.started = true;
  }
  stop(): void {
    this.onend?.();
  }
  abort(): void {
    this.onend?.();
  }
  emitFinal(transcript: string): void {
    this.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, 0: { transcript } } } });
  }
  emitInterim(transcript: string): void {
    this.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: false, 0: { transcript } } } });
  }
}

function installSpeechApi(): void {
  (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition;
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  instances.length = 0;
  vi.restoreAllMocks();
});

describe("AiButton", () => {
  it("swaps the icon for a spinner and disables itself while loading", () => {
    render(<AiButton loading>Summarize</AiButton>);
    const button = screen.getByRole("button", { name: /Summarize/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("forwards clicks when idle", () => {
    const onClick = vi.fn();
    render(<AiButton onClick={onClick}>Summarize</AiButton>);
    fireEvent.click(screen.getByRole("button", { name: /Summarize/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders through Button's ai variants and forwards the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <AiButton ref={ref} data-testid="ai" className="mt-1">
        Summarize
      </AiButton>,
    );
    expect(ref.current).toBe(screen.getByTestId("ai"));
    expect(ref.current).toHaveClass("bg-violet-500/10", "mt-1");
    rerender(<AiButton variant="ai">Summarize</AiButton>);
    expect(screen.getByRole("button")).toHaveClass("bg-violet-600");
  });
});

describe("VoiceInputButton", () => {
  it("renders disabled when the browser has no speech recognition", () => {
    render(<VoiceInputButton onTranscript={() => {}} />);
    const button = screen.getByRole("button", { name: /isn't available/i });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("aria-pressed");
    // Explanation on the wrapper: a disabled button has pointer-events-none, so its own title never shows.
    expect(button.parentElement).toHaveAttribute("title", expect.stringMatching(/isn't available/i));
  });

  it("starts listening on click and reports finalized chunks", () => {
    installSpeechApi();
    const onTranscript = vi.fn();
    render(<VoiceInputButton onTranscript={onTranscript} lang="de-CH" />);
    fireEvent.click(screen.getByRole("button", { name: "Start dictation" }));

    const recognition = instances[0]!;
    expect(recognition.started).toBe(true);
    expect(recognition.lang).toBe("de-CH");
    const listening = screen.getByRole("button", { name: "Stop dictation" });
    expect(listening).toHaveAttribute("aria-pressed", "true");
    // Recording state = destructive tint on the button, pulse on the icon only.
    expect(listening).toHaveClass("border-destructive");
    expect(listening).not.toHaveClass("animate-pulse");
    expect(listening.querySelector("svg")).toHaveClass("animate-pulse");

    act(() => recognition.emitFinal("  hello world  "));
    expect(onTranscript).toHaveBeenCalledWith("hello world");
  });

  it("shows interim words but does not report them as transcript", () => {
    installSpeechApi();
    const onTranscript = vi.fn();
    render(<VoiceInputButton onTranscript={onTranscript} showInterim />);
    fireEvent.click(screen.getByRole("button", { name: "Start dictation" }));
    act(() => instances[0]!.emitInterim("half a sent"));
    expect(screen.getByText("half a sent")).toBeInTheDocument();
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("reports recognizer errors", () => {
    installSpeechApi();
    const onError = vi.fn();
    render(<VoiceInputButton onTranscript={() => {}} onError={onError} />);
    fireEvent.click(screen.getByRole("button", { name: "Start dictation" }));
    act(() => instances[0]!.onerror?.({ error: "not-allowed" }));
    expect(onError).toHaveBeenCalledWith("not-allowed");
  });

  it("forwards the ref and extra button props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<VoiceInputButton ref={ref} onTranscript={() => {}} data-testid="mic" />);
    expect(ref.current).toBe(screen.getByTestId("mic"));
  });

  it("renders enabled with a custom engine even when the browser has no speech API", () => {
    // No installSpeechApi() here -- `engine` alone must be enough.
    const onTranscript = vi.fn();
    render(<VoiceInputButton onTranscript={onTranscript} engine={() => new FakeRecognition()} />);
    const button = screen.getByRole("button", { name: "Start dictation" });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    const recognition = instances[0]!;
    expect(recognition.started).toBe(true);
    act(() => recognition.emitFinal("from a custom engine"));
    expect(onTranscript).toHaveBeenCalledWith("from a custom engine");
  });

  it("builds a fresh engine instance for every start()", () => {
    const engine = vi.fn(() => new FakeRecognition());
    render(<VoiceInputButton onTranscript={() => {}} engine={engine} />);
    fireEvent.click(screen.getByRole("button", { name: "Start dictation" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop dictation" }));
    fireEvent.click(screen.getByRole("button", { name: "Start dictation" }));
    expect(engine).toHaveBeenCalledTimes(2);
  });
});

describe("describeSpeechError", () => {
  it("turns recognizer codes into actionable text and swallows aborts", () => {
    expect(describeSpeechError("not-allowed")).toMatch(/microphone access/i);
    expect(describeSpeechError("aborted")).toBeNull();
    expect(describeSpeechError("something-new")).toBe("Speech recognition failed (something-new).");
  });
});

function ControlledTranscript(props: { onTransform?: (text: string) => Promise<string> }) {
  const [value, setValue] = useState("raw dictated text");
  return <VoiceTranscript value={value} onChange={setValue} onTransform={props.onTransform} />;
}

describe("VoiceTranscript", () => {
  it("appends dictated chunks to the existing transcript", () => {
    installSpeechApi();
    render(<ControlledTranscript />);
    fireEvent.click(screen.getByRole("button", { name: /Dictate/ }));
    act(() => instances[0]!.emitFinal("and more"));
    expect(screen.getByRole("textbox")).toHaveValue("raw dictated text and more");
  });

  it("replaces the transcript with the transform result and can undo it", async () => {
    const onTransform = vi.fn(async (text: string) => `polished: ${text}`);
    render(<ControlledTranscript onTransform={onTransform} />);

    fireEvent.click(screen.getByRole("button", { name: /Transform with AI/ }));
    await waitFor(() =>
      expect(screen.getByRole("textbox")).toHaveValue("polished: raw dictated text"),
    );
    expect(onTransform).toHaveBeenCalledWith("raw dictated text");

    fireEvent.click(screen.getByRole("button", { name: /Undo/ }));
    expect(screen.getByRole("textbox")).toHaveValue("raw dictated text");
  });

  it("surfaces a failing transform instead of swallowing it", async () => {
    render(<ControlledTranscript onTransform={() => Promise.reject(new Error("model offline"))} />);
    fireEvent.click(screen.getByRole("button", { name: /Transform with AI/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("model offline");
    expect(screen.getByRole("textbox")).toHaveValue("raw dictated text");
  });

  it("hides the transform button when no onTransform is given", () => {
    render(<ControlledTranscript />);
    expect(screen.queryByRole("button", { name: /Transform with AI/ })).not.toBeInTheDocument();
  });

  it("shows a mic error as a sentence, not the raw recognizer code", () => {
    installSpeechApi();
    render(<ControlledTranscript />);
    fireEvent.click(screen.getByRole("button", { name: /Dictate/ }));
    act(() => instances[0]!.onerror?.({ error: "not-allowed" }));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/microphone access is blocked/i);
    expect(alert).not.toHaveTextContent("not-allowed");
  });

  it("spreads root attributes like data-testid", () => {
    render(<VoiceTranscript value="" onChange={() => {}} data-testid="transcript" />);
    expect(screen.getByTestId("transcript")).toContainElement(screen.getByRole("textbox"));
  });
});

describe("AiExplainButton", () => {
  it("only calls onExplain once the popover is opened", async () => {
    const onExplain = vi.fn(async () => "Revenue rose because of Q4 renewals.");
    render(<AiExplainButton onExplain={onExplain} />);
    expect(onExplain).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Explain/ }));
    expect(await screen.findByText("Revenue rose because of Q4 renewals.")).toBeInTheDocument();
    expect(onExplain).toHaveBeenCalledOnce();
  });

  it("offers a retry when the explanation fails", async () => {
    const onExplain = vi
      .fn()
      .mockRejectedValueOnce(new Error("rate limited"))
      .mockResolvedValueOnce("second time lucky");
    render(<AiExplainButton onExplain={onExplain} />);
    fireEvent.click(screen.getByRole("button", { name: /Explain/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("rate limited");
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByText("second time lucky")).toBeInTheDocument();
  });
});
