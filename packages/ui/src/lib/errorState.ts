/** Structured error shown by `ErrorState`/`InlineError`. */
export interface ErrorInfo {
  /** Short headline, e.g. "Couldn't load data". */
  title?: string;
  /** Human-readable explanation. */
  message?: string;
  /** Technical details (stack, response body) — shown behind a "Show details" toggle. */
  details?: string;
}

/** What components accept for their `error` prop — pass a TanStack Query / SWR / `catch` error straight through. */
export type ErrorInput = ErrorInfo | Error | string | null | undefined | false;

/** Normalizes any `ErrorInput` (or a raw thrown value) to an `ErrorInfo`; `undefined` when there is no error. */
export function toErrorInfo(error: unknown): ErrorInfo | undefined {
  if (error == null || error === false || error === "") return undefined;
  if (typeof error === "string") return { message: error };
  if (error instanceof Error) {
    return { message: error.message || undefined, details: error.stack };
  }
  if (typeof error === "object") {
    const { title, message, details } = error as ErrorInfo;
    if (title !== undefined || message !== undefined || details !== undefined) return { title, message, details };
  }
  return { message: String(error) };
}
