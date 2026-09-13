import { Loader2, Mic, Square } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface VoiceMicButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** @default "idle" */
  state?: "idle" | "recording" | "transcribing";
  /** `sm`/`md` are inline sizes (a comment textarea's corner); `lg` is the standalone dial-in button. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Shown as a small tooltip above the button and swaps its color to destructive, without disabling it — the user should be able to just tap it again. */
  error?: string | null;
  onToggle?: () => void;
  labels?: { start?: string; stop?: string };
}

const DEFAULT_LABELS: Required<NonNullable<VoiceMicButtonProps["labels"]>> = {
  start: "Start voice input",
  stop: "Stop recording",
};

/**
 * A single toggling mic button, ported from a product that had it wired
 * directly into a `VoiceDrawer` — the two are split apart here because a
 * caller might want the trigger inline (a comment box's corner, a compact
 * status row) without ever mounting the floating capture experience
 * (`VoiceCapturePanel`) that only makes sense once recording is underway.
 *
 * **`error` doesn't disable the button.** A failed connection or a denied
 * mic permission is a one-tap-away retry, not a dead end — the button stays
 * live and just recolors to `destructive` with the message in a tooltip
 * above it, mirroring the way this library treats recoverable errors
 * elsewhere (inline messages, not disabled controls).
 *
 * **Sizing floor.** `lg` (48px) already clears the WCAG 2.5.8 minimum on its
 * own. `sm`/`md` render smaller (24px/30px) for contexts like an inline
 * composer corner where a 48px circle would dominate the row — `tap-target`
 * grows the invisible hit area to the floor without changing the visible
 * size, the same trick `ChatSendButton`'s neighbors use.
 */
export const VoiceMicButton = forwardRef<HTMLButtonElement, VoiceMicButtonProps>(
  ({ state = "idle", size = "md", error, onToggle, labels, className, disabled, ...props }, ref) => {
    const l = { ...DEFAULT_LABELS, ...labels };
    const recording = state === "recording";
    const transcribing = state === "transcribing";

    const dim = size === "sm" ? "size-6" : size === "lg" ? "size-12 rounded-full shadow-lg" : "size-[30px]";
    const icon = size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";

    return (
      <div className="relative inline-flex flex-col items-center">
        <button
          ref={ref}
          type="button"
          data-slot="voice-mic-button"
          data-state={state}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggle}
          disabled={disabled || transcribing}
          aria-label={recording ? l.stop : l.start}
          title={error ?? (recording ? l.stop : l.start)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            size !== "lg" && "tap-target",
            dim,
            error
              ? "text-destructive hover:bg-destructive/10"
              : recording || transcribing
                ? size === "lg"
                  ? "bg-destructive text-destructive-foreground"
                  : "animate-pulse bg-primary/10 text-primary"
                : size === "lg"
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
            (disabled || transcribing) && "cursor-not-allowed opacity-50",
            className,
          )}
          {...props}
        >
          {transcribing ? (
            <Loader2 aria-hidden="true" className={cn(icon, "animate-spin")} />
          ) : recording && size === "lg" ? (
            <Square aria-hidden="true" className={icon} fill="currentColor" />
          ) : (
            <Mic aria-hidden="true" className={icon} />
          )}
        </button>
        {error && (
          <div
            data-slot="voice-mic-error"
            role="alert"
            className="absolute bottom-full left-1/2 mb-1.5 w-60 -translate-x-1/2 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[10.5px] text-destructive shadow-md"
          >
            {error}
          </div>
        )}
      </div>
    );
  },
);
VoiceMicButton.displayName = "VoiceMicButton";
