import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Sheet, SheetOverlay, SheetPortal } from "../../primitives/sheet";
import { VoiceMicButton } from "./VoiceMicButton";

const BAR_COUNT = 12;

/**
 * A CSS-animated bar visualizer driven off `audioLevel` (0–1) via
 * `requestAnimationFrame`, not React state — at the framerate a live mic
 * level updates, re-rendering 12 children through React on every frame would
 * be the actual bottleneck. Each bar keeps a random phase offset so they
 * don't all pulse in lockstep, which reads as a stuck fax tone rather than
 * a voice waveform.
 */
function VoiceLevelBars({ audioLevel }: { audioLevel: number }): ReactElement {
  const rafRef = useRef(0);
  const levelRef = useRef(audioLevel);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const jitterRef = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => Math.random()));
  const smoothRef = useRef(0);

  useEffect(() => {
    levelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    const animate = (): void => {
      const target = levelRef.current;
      smoothRef.current += (target - smoothRef.current) * (target > smoothRef.current ? 0.18 : 0.07);
      const t = performance.now() / 1000;

      for (const [i, el] of barsRef.current.entries()) {
        if (!el) continue;
        const jitter = jitterRef.current[i] ?? 0;
        const wave = 0.5 + 0.5 * Math.sin(t * 3.2 + jitter * Math.PI * 2);
        const h = 8 + (wave * 72 + 20) * smoothRef.current;
        el.style.height = `${Math.min(100, Math.max(8, h))}%`;
        const op = 0.55 + 0.45 * wave * smoothRef.current;
        el.style.opacity = String(Math.min(1, Math.max(0.3, op)));
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div data-slot="voice-level-bars" className="flex h-14 items-end justify-center gap-1 px-1">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length visual filler, never reordered
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="h-[20%] max-w-3.5 min-h-[8%] flex-1 rounded-t-[3px] rounded-b-[2px] bg-destructive opacity-40"
        />
      ))}
    </div>
  );
}

function useElapsedTimer(running: boolean): string {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  useEffect(() => {
    if (!running) {
      setElapsed(0);
      return;
    }
    startRef.current = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 250);
    return () => clearInterval(id);
  }, [running]);
  const s = Math.floor(elapsed / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface VoiceCapturePanelProps {
  open: boolean;
  /** 0–1 input level, fed straight into the bar visualizer. Ignored while `status` isn't `"listening"`. */
  audioLevel: number;
  /** @default "listening" */
  status?: "listening" | "transcribing" | "reconnecting";
  transcript?: string;
  /** In-flight words not yet committed to `transcript` — appended live, right up against the last committed word. */
  partial?: string;
  /** A chip above the mic naming what this dictation feeds, e.g. "Visit note". */
  contextLabel?: ReactNode;
  /** A slot for option pickers (language, model, latency…) — compose from `Tabs`/`TabsList`/`TabsTrigger`. */
  tabs?: ReactNode;
  /** Backdrop click, Escape, or any incidental dismiss — must still deliver the transcript, so this is never wired to discard it. */
  onStop: () => void;
  /** Only the explicit Cancel button calls this. Omit to fold Cancel into `onStop`. */
  onDiscard?: () => void;
  labels?: {
    listening?: string;
    transcribing?: string;
    reconnecting?: string;
    placeholder?: string;
    cancel?: string;
    done?: string;
  };
  className?: string;
}

const DEFAULT_LABELS: Required<NonNullable<VoiceCapturePanelProps["labels"]>> = {
  listening: "Listening…",
  transcribing: "Transcribing…",
  reconnecting: "Reconnecting…",
  placeholder: "Start speaking…",
  cancel: "Cancel",
  done: "Done",
};

/**
 * The floating "you're recording right now" surface: a bottom sheet on
 * mobile, a centered floating dock on desktop, both mounted from the same
 * `Sheet` so Escape/backdrop-click behave identically on either layout. This
 * was ported from a product that rendered two visually distinct surfaces
 * (`sm:hidden` / `hidden sm:flex`) inside one dialog rather than switching
 * component trees at the breakpoint — a media-query swap would remount the
 * bar visualizer and transcript scroll position every time the viewport
 * crossed the breakpoint (e.g. a foldable, or a devtools resize), which a
 * live "still recording" surface can't afford to do silently.
 *
 * **Not a `SheetContent`.** `primitives/sheet.tsx`'s side variants assume a
 * single edge-anchored panel with a border seam and a close-X — this
 * renders two differently-shaped surfaces from one dialog and neither wants
 * that chrome, so it builds directly on `Sheet`/`SheetPortal`/`SheetOverlay`
 * (the same primitives `SheetContent` itself composes) plus a bespoke
 * `DialogPrimitive.Content`.
 *
 * **Stateless.** Timer, and the bar visualizer's smoothing, are the only
 * state owned here — both are pure rendering concerns with no product
 * meaning. `audioLevel`, `transcript`/`partial`, and `status` all come from
 * the consumer's own recording hook; this component never guesses at
 * whether recording is still happening.
 */
export function VoiceCapturePanel({
  open,
  audioLevel,
  status = "listening",
  transcript,
  partial,
  contextLabel,
  tabs,
  onStop,
  onDiscard,
  labels,
  className,
}: VoiceCapturePanelProps): ReactElement {
  const l = { ...DEFAULT_LABELS, ...labels };
  const level = status === "listening" ? audioLevel : 0;
  const timer = useElapsedTimer(open && status === "listening");
  const displayText = partial ? (transcript ? `${transcript} ${partial}` : partial) : transcript || null;

  // Keeps the transcript scrolled to its latest line as displayText grows past
  // maxHeight — otherwise the words actively being dictated scroll out of view
  // above the fold and the user has to manually scroll to see what's current.
  const mobileBoxRef = useRef<HTMLDivElement>(null);
  const desktopBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    for (const ref of [mobileBoxRef, desktopBoxRef]) {
      const el = ref.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [displayText]);

  const statusLabel =
    status === "transcribing" ? l.transcribing : status === "reconnecting" ? l.reconnecting : l.listening;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onStop();
      }}
    >
      <SheetPortal>
        <SheetOverlay className="bg-black/30 backdrop-blur-[2px] duration-300" />
        <DialogPrimitive.Content
          data-slot="voice-capture-panel"
          className={cn("fixed z-50 outline-none", className)}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Mobile: bottom sheet */}
          <div
            data-slot="voice-capture-panel-mobile"
            className={cn(
              "fixed inset-x-0 bottom-0 flex flex-col items-center rounded-t-3xl border-t border-border bg-card pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-card-foreground shadow-2xl transition-transform duration-300 ease-out sm:hidden",
              open ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="my-1 h-1 w-9 rounded-full bg-border" />
            {contextLabel && (
              <div className="mt-3 mb-4 rounded-full bg-muted px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground">
                {contextLabel}
              </div>
            )}
            <VoiceMicButton
              size="lg"
              state={status === "listening" ? "recording" : "transcribing"}
              onToggle={onStop}
              labels={{ stop: l.done }}
              className="mb-3"
            />
            <span className="text-sm font-semibold tracking-wide">{statusLabel}</span>
            <span className="mt-1 mb-4 font-mono text-xs text-muted-foreground">{timer}</span>
            <div className="mb-4 w-[calc(100%-3rem)]">
              <VoiceLevelBars audioLevel={level} />
            </div>
            <div
              ref={mobileBoxRef}
              className={cn(
                "mb-5 max-h-30 min-h-13 w-[calc(100%-3rem)] overflow-y-auto rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm leading-relaxed",
                displayText ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {displayText ?? l.placeholder}
            </div>
            {tabs && <div className="mb-3.5">{tabs}</div>}
            <div className="flex w-[calc(100%-3rem)] items-center justify-between">
              <button
                type="button"
                onClick={onDiscard ?? onStop}
                className="rounded-md px-0 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {l.cancel}
              </button>
              <button
                type="button"
                onClick={onStop}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block size-2.5 shrink-0 rounded-[3px] bg-primary-foreground" />
                {l.done}
              </button>
            </div>
          </div>

          {/* Desktop: centered floating dock */}
          <div
            data-slot="voice-capture-panel-desktop"
            className={cn(
              "fixed bottom-5.5 left-1/2 hidden w-[min(680px,calc(100%-3rem))] flex-col items-center rounded-3xl border border-border bg-card p-6 pt-6 pb-5 text-card-foreground shadow-2xl transition-all duration-300 ease-out sm:flex",
              open ? "-translate-x-1/2 translate-y-0 opacity-100" : "-translate-x-1/2 translate-y-[calc(100%+2.5rem)] opacity-0",
            )}
          >
            {contextLabel && (
              <div className="mb-4 rounded-full bg-muted px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground">
                {contextLabel}
              </div>
            )}
            <VoiceMicButton
              size="lg"
              state={status === "listening" ? "recording" : "transcribing"}
              onToggle={onStop}
              labels={{ stop: l.done }}
              className="mb-3"
            />
            <span className="text-sm font-semibold tracking-wide">{statusLabel}</span>
            <span className="mt-1 mb-4 font-mono text-xs text-muted-foreground">{timer}</span>
            <div className="mb-4 w-full">
              <VoiceLevelBars audioLevel={level} />
            </div>
            <div
              ref={desktopBoxRef}
              className={cn(
                "mb-4.5 max-h-20 min-h-11 w-full overflow-y-auto rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-[13.5px] leading-relaxed",
                displayText ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {displayText ?? l.placeholder}
            </div>
            {tabs && <div className="mb-3.5">{tabs}</div>}
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={onDiscard ?? onStop}
                className="rounded-md px-0 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {l.cancel}
              </button>
              <button
                type="button"
                onClick={onStop}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block size-2.5 shrink-0 rounded-[3px] bg-primary-foreground" />
                {l.done}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}
