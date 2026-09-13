import { Loader2, Mic, Sparkles } from "lucide-react";
import type { ReactElement } from "react";
import { cn } from "../../lib/utils";
import { VoiceMicButton } from "./VoiceMicButton";

export interface VoiceNoteCardProps {
  /** Closed: a one-line trigger row. Open: the full dictate/review card. */
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Mic state for the embedded `VoiceMicButton`; pass `"recording"` once the card mounts if dictation should auto-start. */
  micState?: "idle" | "recording" | "transcribing";
  onMicToggle?: () => void;
  value: string;
  onValueChange: (text: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  labels?: {
    title?: string;
    hint?: string;
    placeholder?: string;
    submit?: string;
    close?: string;
  };
  className?: string;
}

const DEFAULT_LABELS: Required<NonNullable<VoiceNoteCardProps["labels"]>> = {
  title: "Fill by voice",
  hint: "Dictate, then let AI structure it",
  placeholder: "Speak or type…",
  submit: "Extract with AI",
  close: "Close",
};

/**
 * A dictate-then-extract flow, collapsed to a single trigger row until
 * opened: tap it, dictate over the embedded `VoiceMicButton`, review or edit
 * the raw text, then hand it to an AI extraction step. Ported from a form
 * that mounted this exact shape inline (an appointment editor's "fill the
 * whole form by voice" affordance) rather than as a modal — the surrounding
 * form fields it's populating stay visible and editable the whole time,
 * which a `VoiceCapturePanel` overlay would hide.
 *
 * **Two branches, one component, on purpose.** The closed row and the open
 * card are simple enough to inline as `open ? … : …` rather than splitting
 * into `VoiceNoteCardTrigger` + `VoiceNoteCardBody` — nothing outside this
 * file ever needs the closed trigger without the open card it opens into.
 *
 * **No transcript state of its own.** `value`/`onValueChange` and
 * `micState`/`onMicToggle` are fully controlled, same reasoning as
 * `ChoiceBlock`: the consumer's recording hook and AI-extraction call both
 * already need to own this text, and a second, shadow copy here would only
 * invite the two to drift.
 */
export function VoiceNoteCard({
  open,
  onOpen,
  onClose,
  micState = "idle",
  onMicToggle,
  value,
  onValueChange,
  onSubmit,
  submitting = false,
  labels,
  className,
}: VoiceNoteCardProps): ReactElement {
  const l = { ...DEFAULT_LABELS, ...labels };

  if (!open) {
    return (
      <button
        type="button"
        data-slot="voice-note-card-trigger"
        onClick={onOpen}
        className={cn(
          "flex shrink-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          className,
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Mic aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">{l.title}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{l.hint}</span>
        </span>
        <Sparkles aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div
      data-slot="voice-note-card"
      className={cn("flex flex-col rounded-xl border border-border bg-card", className)}
    >
      <div className="flex items-center justify-between border-b border-border py-2 pr-2 pl-4">
        <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <Sparkles aria-hidden="true" className="size-3" />
          {l.title}
        </span>
        <div className="flex items-center gap-1">
          <VoiceMicButton state={micState} onToggle={onMicToggle} />
          <button
            type="button"
            onClick={onClose}
            aria-label={l.close}
            title={l.close}
            className="tap-target inline-flex size-[30px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
              <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={l.placeholder}
        rows={4}
        className="min-h-25 w-full resize-y bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/40"
      />
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {submitting ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" className="size-4" />
          )}
          {l.submit}
        </button>
      </div>
    </div>
  );
}
