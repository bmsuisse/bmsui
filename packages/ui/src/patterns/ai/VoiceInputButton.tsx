import { Mic, MicOff } from "lucide-react";
import type { ReactElement } from "react";
import { Button, type ButtonProps } from "../../primitives/button";
import { cn } from "../../lib/utils";
import { useSpeechRecognition } from "./useSpeechRecognition";

export interface VoiceInputButtonProps
  extends Omit<ButtonProps, "onError" | "variant" | "children"> {
  /** Called with each finalized chunk of speech, ready to append to whatever the caller is filling in. */
  onTranscript: (text: string) => void;
  /** Called with the recognizer's error code (`"not-allowed"`, `"no-speech"`, ...). */
  onError?: (error: string) => void;
  /** BCP-47 tag, e.g. `"de-CH"`. Defaults to the document language. */
  lang?: string;
  /** Rendered next to the icon. Icon-only (the default) when omitted. */
  label?: string;
  /** Accessible labels for the two states. */
  startLabel?: string;
  stopLabel?: string;
  /** Renders the interim (not yet finalized) words next to the button. @default false */
  showInterim?: boolean;
}

/**
 * Push-to-dictate microphone button, backed by the browser's built-in
 * `SpeechRecognition` — no API key, no upload, no extra dependency. While
 * listening it pulses red; where the API is missing (Firefox, most mobile)
 * the button renders disabled with a crossed-out mic rather than vanishing,
 * so the layout doesn't shift between browsers.
 */
export function VoiceInputButton({
  onTranscript,
  onError,
  lang,
  label,
  startLabel = "Start dictation",
  stopLabel = "Stop dictation",
  showInterim = false,
  size,
  disabled,
  className,
  ...props
}: VoiceInputButtonProps): ReactElement {
  const { supported, listening, interim, toggle } = useSpeechRecognition({
    lang,
    onResult: onTranscript,
    onError,
  });

  const unsupportedTitle = "Speech recognition isn't available in this browser";
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size={size ?? (label ? "default" : "icon")}
        onClick={toggle}
        disabled={disabled || !supported}
        title={supported ? undefined : unsupportedTitle}
        aria-label={label ? undefined : supported ? (listening ? stopLabel : startLabel) : unsupportedTitle}
        aria-pressed={listening}
        className={cn(
          listening &&
            "animate-pulse border-red-400 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400",
          className,
        )}
        {...props}
      >
        {supported ? <Mic className="h-4 w-4" aria-hidden={true} /> : <MicOff className="h-4 w-4" aria-hidden={true} />}
        {label}
      </Button>
      {showInterim && interim ? (
        <span className="text-sm text-muted-foreground italic">{interim}</span>
      ) : null}
    </span>
  );
}
