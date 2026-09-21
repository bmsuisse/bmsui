import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API isn't in TypeScript's DOM lib, so the minimal shape we
// actually touch is declared here rather than pulling in @types/dom-speech-recognition.
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
}
/**
 * The recognizer contract `useSpeechRecognition` drives — matches the shape
 * of the browser's built-in `SpeechRecognition`/`webkitSpeechRecognition`,
 * which is also what the default engine (below) wraps. Implement this to
 * swap in something other than the browser's on-device recognizer — for
 * example a server-side transcription API — via the `engine` option.
 * Whatever backs it, finalized chunks and interim words must arrive through
 * `onresult` the same way the Web Speech API delivers them.
 */
export interface SpeechRecognitionEngine {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
/** Builds one `SpeechRecognitionEngine` per dictation session (`start()` calls it fresh each time). */
export type SpeechRecognitionEngineFactory = () => SpeechRecognitionEngine;
type SpeechRecognitionCtor = new () => SpeechRecognitionEngine;

function getCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** The default engine: the browser's own `SpeechRecognition`/`webkitSpeechRecognition`. */
function browserEngine(): SpeechRecognitionEngine | null {
  const Ctor = getCtor();
  return Ctor ? new Ctor() : null;
}

/**
 * Turns a recognizer error code into a sentence a user can act on, or `null`
 * for codes that aren't the user's problem (`aborted` fires on every
 * programmatic stop/unmount and would otherwise flash an alert on each one).
 * `onError` still receives the raw code, for callers who want to branch.
 */
export function describeSpeechError(code: string): string | null {
  switch (code) {
    case "aborted":
      return null;
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow it in the browser's site settings and try again.";
    case "audio-capture":
      return "No microphone was found.";
    case "no-speech":
      return "No speech was detected.";
    case "network":
      return "Speech recognition needs a network connection.";
    default:
      return `Speech recognition failed (${code}).`;
  }
}

export interface UseSpeechRecognitionOptions {
  /** BCP-47 tag passed to the recognizer, e.g. `"de-CH"`. @default the document language, else "en-US" */
  lang?: string;
  /** Called with each finalized chunk of speech. */
  onResult?: (text: string) => void;
  /** Called when the recognizer reports an error (`"not-allowed"`, `"no-speech"`, ...). */
  onError?: (error: string) => void;
  /**
   * Overrides what backs dictation — e.g. to stream audio to a server-side
   * transcription API instead of the browser's on-device `SpeechRecognition`.
   * Called once per `start()` to build that session's engine; must satisfy
   * `SpeechRecognitionEngine`. Omit to use the browser's Web Speech API
   * (`supported` then reflects whether that API exists); passing `engine`
   * makes `supported` unconditionally `true`, since the caller's factory is
   * assumed to work wherever the app decides to render the button.
   */
  engine?: SpeechRecognitionEngineFactory;
}

export interface SpeechRecognitionState {
  /** False when neither a custom `engine` nor the browser's Web Speech API is available (Firefox, most of mobile, SSR). */
  supported: boolean;
  listening: boolean;
  /** The not-yet-finalized words the recognizer is still revising. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

/**
 * Thin hook over a `SpeechRecognitionEngine` — by default the browser's
 * built-in `SpeechRecognition`, so no dependency and no server round-trip;
 * pass `engine` to back it with something else (e.g. a server-side
 * transcription API) instead. Finalized chunks are pushed to `onResult`;
 * the caller owns the accumulated transcript (so it stays editable), this
 * only reports what's currently being heard.
 */
export function useSpeechRecognition({
  lang,
  onResult,
  onError,
  engine,
}: UseSpeechRecognitionOptions = {}): SpeechRecognitionState {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionEngine | null>(null);
  // Kept in refs so restarting the recognizer isn't needed when a caller
  // passes fresh inline callbacks on every render.
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const engineRef = useRef(engine);
  onResultRef.current = onResult;
  onErrorRef.current = onError;
  engineRef.current = engine;

  const supported = engine !== undefined || getCtor() !== undefined;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (recognitionRef.current) return;
    const recognition = engineRef.current ? engineRef.current() : browserEngine();
    if (!recognition) return;
    recognition.lang =
      lang ?? (typeof document !== "undefined" ? document.documentElement.lang : "") ?? "";
    if (!recognition.lang) recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        if (result.isFinal) onResultRef.current?.(result[0].transcript.trim());
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    recognition.onerror = (event) => {
      setError(event.error);
      onErrorRef.current?.(event.error);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
    };
    recognitionRef.current = recognition;
    setError(null);
    setInterim("");
    setListening(true);
    recognition.start();
  }, [lang]);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  // Abort rather than stop on unmount: stop() would still fire a final
  // onresult into callbacks whose component is already gone.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, interim, error, start, stop, toggle };
}
