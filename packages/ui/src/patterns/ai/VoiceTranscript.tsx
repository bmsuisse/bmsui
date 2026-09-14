import { Undo2, Wand2 } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";
import { Textarea } from "../../primitives/textarea";
import { Button } from "../../primitives/button";
import { cn } from "../../lib/utils";
import { AiButton } from "./AiButton";
import { VoiceInputButton } from "./VoiceInputButton";

export interface VoiceTranscriptProps {
  /** The transcript. Controlled, like `SearchBar` — the caller owns the text. */
  value: string;
  onChange: (value: string) => void;
  /**
   * Rewrites the transcript with AI (clean up, translate, summarize —
   * whatever the caller's model does) and resolves with the new text.
   * Omitted hides the transform button, leaving plain dictation.
   */
  onTransform?: (text: string) => Promise<string> | string;
  /** @default "Transform with AI" */
  transformLabel?: string;
  /** @default "Speak or type…" */
  placeholder?: string;
  /** BCP-47 tag for dictation, e.g. `"de-CH"`. Defaults to the document language. */
  lang?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Dictate → edit → rewrite-with-AI, in one box: a mic button feeding an
 * editable transcript, plus a "Transform with AI" action that hands the text
 * to the caller's model and swaps in the result (with one-click undo, since
 * a model rewriting your own words is exactly where you want an escape hatch).
 */
export function VoiceTranscript({
  value,
  onChange,
  onTransform,
  transformLabel = "Transform with AI",
  placeholder = "Speak or type…",
  lang,
  rows = 4,
  disabled,
  className,
}: VoiceTranscriptProps): ReactElement {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);

  const append = (chunk: string): void => {
    onChange(value ? `${value.trimEnd()} ${chunk}` : chunk);
  };

  const transform = async (): Promise<void> => {
    if (!onTransform) return;
    const before = value;
    setLoading(true);
    setError(null);
    try {
      const next = await onTransform(before);
      setPrevious(before);
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const undo = (): void => {
    if (previous === null) return;
    onChange(previous);
    setPrevious(null);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled || loading}
      />
      <div className="flex flex-wrap items-center gap-2">
        <VoiceInputButton
          onTranscript={append}
          onError={setError}
          lang={lang}
          label="Dictate"
          size="sm"
          showInterim
          disabled={disabled || loading}
        />
        {onTransform ? (
          <AiButton
            tone="solid"
            size="sm"
            icon={Wand2}
            loading={loading}
            disabled={disabled || value.trim().length === 0}
            onClick={() => void transform()}
          >
            {transformLabel}
          </AiButton>
        ) : null}
        {previous !== null && !loading ? (
          <Button type="button" variant="ghost" size="sm" onClick={undo}>
            <Undo2 className="h-4 w-4" aria-hidden={true} />
            Undo
          </Button>
        ) : null}
        {error ? (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
