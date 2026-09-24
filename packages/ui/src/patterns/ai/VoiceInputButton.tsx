import { MicrophoneIcon, SlashIcon } from "@heroicons/react/24/outline";
import { forwardRef } from "react";
import { Button, type ButtonProps } from "../../primitives/button";
import { cn } from "../../lib/utils";
import { type SpeechRecognitionEngineFactory, useSpeechRecognition } from "./useSpeechRecognition";

export interface VoiceInputButtonProps
  extends Omit<ButtonProps, "onError" | "variant" | "children"> {
  /** Called with each finalized chunk of speech, ready to append to whatever the caller is filling in. */
  onTranscript: (text: string) => void;
  /** Called with the recognizer's raw error code (`"not-allowed"`, `"no-speech"`, ...) — see `describeSpeechError` for user-facing text. */
  onError?: (error: string) => void;
  /** BCP-47 tag, e.g. `"de-CH"`. Defaults to the document language. */
  lang?: string;
  /**
   * Overrides what backs dictation — e.g. to stream audio to a server-side
   * transcription API instead of the browser's on-device `SpeechRecognition`.
   * See `useSpeechRecognition`'s `engine` option. Passing this makes the
   * button render enabled unconditionally, since browser support no longer
   * applies.
   */
  engine?: SpeechRecognitionEngineFactory;
  /** Rendered next to the icon. Icon-only (the default) when omitted. */
  label?: string;
  /** Accessible name while idle (icon-only buttons only). @default "Start dictation" */
  startLabel?: string;
  /** Accessible name while listening (icon-only buttons only). @default "Stop dictation" */
  stopLabel?: string;
  /** Renders the interim (not yet finalized) words next to the button. @default false */
  showInterim?: boolean;
}

/**
 * Push-to-dictate microphone button, backed by the browser's built-in
 * `SpeechRecognition` by default — no API key, no upload, no extra
 * dependency. Pass `engine` to back it with something else instead, such as
 * a server-side transcription API (see `useSpeechRecognition`'s `engine`
 * option). While listening it takes the `destructive` tint (the same one
 * AlertBox's `error` uses) and only the mic icon pulses, so the "recording"
 * signal reads at a glance without the whole control throbbing. Where
 * neither `engine` nor the browser API is available (Firefox, most mobile)
 * the button renders disabled with a crossed-out mic rather than vanishing,
 * so the layout doesn't shift between browsers.
 */
export const VoiceInputButton = forwardRef<HTMLButtonElement, VoiceInputButtonProps>(
  (
    {
      onTranscript,
      onError,
      lang,
      engine,
      label,
      startLabel = "Start dictation",
      stopLabel = "Stop dictation",
      showInterim = false,
      size,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    const { supported, listening, interim, toggle } = useSpeechRecognition({
      lang,
      onResult: onTranscript,
      onError,
      engine,
    });
    const unsupportedTitle = "Speech recognition isn't available in this browser";

    return (
      // `title` lives on the wrapper, not the button: buttonVariants sets
      // `disabled:pointer-events-none`, so a disabled button never shows its own.
      <span className="inline-flex min-w-0 items-center gap-2" title={supported ? undefined : unsupportedTitle}>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          size={size ?? (label ? "default" : "icon")}
          onClick={toggle}
          disabled={disabled || !supported}
          aria-label={label ? undefined : supported ? (listening ? stopLabel : startLabel) : unsupportedTitle}
          aria-pressed={supported ? listening : undefined}
          className={cn(
            listening &&
              "border-destructive bg-destructive/10 text-red-800 hover:bg-destructive/15 hover:text-red-800 dark:text-red-300 dark:hover:text-red-300",
            className,
          )}
          {...props}
        >
          {supported ? (
            <MicrophoneIcon
              className={cn("h-4 w-4", listening && "animate-pulse motion-reduce:animate-none")}
              aria-hidden="true"
            />
          ) : (
            // heroicons has no muted-mic glyph -- MicrophoneIcon plus SlashIcon
            // (same 24x24 viewBox/stroke) layered on top approximates one.
            <span className="relative inline-flex h-4 w-4" aria-hidden="true">
              <MicrophoneIcon className="h-4 w-4" />
              <SlashIcon className="absolute inset-0 h-4 w-4" />
            </span>
          )}
          {label}
        </Button>
        {showInterim && interim ? (
          <span aria-live="polite" className="truncate text-sm text-muted-foreground italic">
            {interim}
          </span>
        ) : null}
      </span>
    );
  },
);
VoiceInputButton.displayName = "VoiceInputButton";
