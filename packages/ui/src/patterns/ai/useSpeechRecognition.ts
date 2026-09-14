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
interface SpeechRecognitionLike {
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
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export interface UseSpeechRecognitionOptions {
  /** BCP-47 tag passed to the recognizer, e.g. `"de-CH"`. @default the document language, else "en-US" */
  lang?: string;
  /** Called with each finalized chunk of speech. */
  onResult?: (text: string) => void;
  /** Called when the recognizer reports an error (`"not-allowed"`, `"no-speech"`, ...). */
  onError?: (error: string) => void;
}

export interface SpeechRecognitionState {
  /** False when the browser has no Web Speech API (Firefox, most of mobile, SSR). */
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
 * Thin hook over the browser's built-in `SpeechRecognition` — no dependency,
 * no server round-trip. Finalized chunks are pushed to `onResult`; the caller
 * owns the accumulated transcript (so it stays editable), this only reports
 * what's currently being heard.
 */
export function useSpeechRecognition({
  lang,
  onResult,
  onError,
}: UseSpeechRecognitionOptions = {}): SpeechRecognitionState {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Kept in refs so restarting the recognizer isn't needed when a caller
  // passes fresh inline callbacks on every render.
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  const supported = getCtor() !== undefined;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || recognitionRef.current) return;
    const recognition = new Ctor();
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
