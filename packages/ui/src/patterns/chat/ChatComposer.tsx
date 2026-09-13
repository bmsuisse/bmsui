import { ArrowUp, Square } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  ForwardedRef,
  HTMLAttributes,
  KeyboardEvent,
  MutableRefObject,
  ReactNode,
  RefObject,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef, useLayoutEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";

export interface ChatComposerProps extends HTMLAttributes<HTMLDivElement> {
  /** The textarea — a `ChatComposerInput`, or a runtime's own input via `render={<ChatComposerInput/>}`. */
  children: ReactNode;
  /**
   * Left of the action row: attach, mic, model picker… Consumers should
   * build these from `Button size="icon-sm"` (the same `size-10 md:size-8`
   * responsive bump `ChatSendButton` uses) so the row's touch targets stay
   * consistent regardless of which buttons a given app wires up.
   */
  extras?: ReactNode;
  /** Right side: normally a `ChatSendButton`. */
  action?: ReactNode;
  /** Dashed drop-target state; the consumer sets this from its own dropzone. */
  dragging?: boolean;
  disabled?: boolean;
  /** @default "1.5rem" */
  radius?: string;
}

/**
 * The card shell around a chat input: textarea on top, an action row below
 * (extras on the left, send/stop on the right). It owns exactly one thing —
 * layout and the visual states (dragging, disabled) — and nothing about
 * what's typed or sent. That split exists because every real consumer here
 * runs on a headless chat runtime (assistant-ui) that already owns message
 * and composer state; a shell that tried to also own value/submission would
 * either fight that runtime or need an escape hatch for every one of its
 * events. So this component takes its content as slots (`children`, `extras`,
 * `action`) and pure visual flags (`dragging`, `disabled`), and the runtime
 * decides what goes in each slot.
 *
 * **Why `radius` is a prop instead of a Tailwind class override.** The shell
 * sets `--chat-composer-radius` (and reads `--chat-composer-bg`) as CSS
 * custom properties rather than baking a Tailwind `rounded-*` class, so a
 * consuming app can repoint either variable from *outside* this component
 * (a CSS rule targeting `.my-chat-shell`, or a wrapping `style` prop) without
 * needing a new prop for every visual knob. `radius` is the ergonomic
 * per-instance path; the CSS variable is the escape hatch for anything the
 * prop surface doesn't cover (e.g. a theme-wide override applied once at a
 * layout root).
 *
 * **`dragging` and `disabled` are booleans the consumer already has**, not
 * new state this component introduces. A dropzone hook already tracks
 * "something is being dragged over me"; this just renders that fact. No
 * internal drag-event wiring is built here — see the file-level "NOT
 * building" list in the brief this shipped against.
 */
export const ChatComposer = forwardRef<HTMLDivElement, ChatComposerProps>(
  ({ children, extras, action, dragging, disabled, radius = "1.5rem", className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="chat-composer"
        data-dragging={dragging ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        style={{ ["--chat-composer-radius" as string]: radius, ...style }}
        className={cn(
          "rounded-[var(--chat-composer-radius)] border border-border/60 bg-[var(--chat-composer-bg,var(--card))] p-2",
          "transition-colors duration-150 motion-reduce:transition-none",
          dragging && "border-dashed border-ring",
          className,
        )}
        {...props}
      >
        <div data-slot="chat-composer-input">{children}</div>
        <div
          data-slot="chat-composer-actions"
          className={cn(
            "mt-1 flex items-center justify-between gap-2",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <div data-slot="chat-composer-extras" className="flex items-center gap-1">
            {extras}
          </div>
          <div data-slot="chat-composer-action" className="flex items-center gap-1">
            {action}
          </div>
        </div>
      </div>
    );
  },
);
ChatComposer.displayName = "ChatComposer";

export interface ChatComposerInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** @default 1 */
  minRows?: number;
  /** @default 6 */
  maxRows?: number;
  /** Enter sends, Shift+Enter inserts a newline. Omit if the runtime already handles submit. */
  onSubmit?: () => void;
}

/**
 * Merges a forwarded ref with an internal one — the autogrow effect needs a
 * live handle on the DOM node regardless of whether the caller (or a
 * headless runtime's own `render` plumbing) also passed a ref in.
 */
function useMergedRef<T>(forwardedRef: ForwardedRef<T>, innerRef: RefObject<T>): (node: T) => void {
  return (node: T) => {
    (innerRef as MutableRefObject<T | null>).current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) (forwardedRef as MutableRefObject<T | null>).current = node;
  };
}

/**
 * The auto-growing textarea itself. Deliberately a *plain* textarea — no
 * border, no ring, `bg-transparent` — because `ChatComposer` already draws
 * the card border; a focus ring on the textarea *and* a border-color change
 * on the shell would read as two competing focus states for one control.
 * (If a consumer renders this outside a `ChatComposer` shell, it should add
 * its own focus treatment — this component doesn't assume it's always
 * nested.)
 *
 * `text-base` (16px) is load-bearing, not a style preference: anything
 * smaller makes iOS Safari zoom the whole page on focus, which is worse than
 * any font-size opinion this library could have.
 *
 * Autogrow measures `scrollHeight` after resetting `height` to `auto` (the
 * standard trick — otherwise `scrollHeight` reports the *old* height and
 * never shrinks back down when text is deleted), then clamps to
 * `maxRows * lineHeight` and switches on internal scrolling once capped.
 * jsdom always reports `scrollHeight` as 0, so the effect is guarded to be a
 * no-op in that case rather than writing a bogus 0px height.
 */
export const ChatComposerInput = forwardRef<HTMLTextAreaElement, ChatComposerInputProps>(
  ({ minRows = 1, maxRows = 6, onSubmit, className, onKeyDown, rows, value, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const setRefs = useMergedRef(forwardedRef, innerRef);

    useLayoutEffect(() => {
      const node = innerRef.current;
      if (!node) return;
      node.style.height = "auto";
      const scrollHeight = node.scrollHeight;
      if (!scrollHeight) return; // jsdom reports 0 — nothing to measure yet.
      const lineHeight = Number.parseFloat(getComputedStyle(node).lineHeight || "24") || 24;
      const maxHeight = maxRows * lineHeight;
      const next = Math.min(scrollHeight, maxHeight);
      node.style.height = `${next}px`;
      node.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    }, [value, maxRows]);

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (
        onSubmit &&
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        onSubmit();
      }
    };

    return (
      <textarea
        ref={setRefs}
        rows={rows ?? minRows}
        value={value}
        onKeyDown={handleKeyDown}
        enterKeyHint="send"
        className={cn(
          "min-h-10 max-h-48 w-full resize-none border-0 bg-transparent text-base leading-6 text-foreground",
          "caret-primary placeholder:text-muted-foreground outline-none focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
ChatComposerInput.displayName = "ChatComposerInput";

export interface ChatSendButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** @default "send" — the morph is the point: one button, same spot, never two. */
  state?: "send" | "stop";
  labels?: { send?: string; stop?: string };
}

const DEFAULT_SEND_LABELS: Required<NonNullable<ChatSendButtonProps["labels"]>> = {
  send: "Send",
  stop: "Stop",
};

/**
 * One round button occupying one spot in the composer's action row, that
 * morphs between "send this message" and "stop the in-flight generation".
 * Deliberately not two buttons swapped in and out — a runtime that's mid
 * stream and one that's idle should never show two different elements in
 * the same visual slot, because that's exactly the kind of layout jitter
 * that makes a chat input feel unstable while a response is streaming.
 *
 * Sized `size-10 md:size-8` (40px phone / 32px desktop) to match this
 * library's touch-target floor. The composer this pattern is modeled on
 * used a 28px desktop button; that's below the floor documented across this
 * package's other patterns (see `SearchBar`'s 40px/44px steps), so it was
 * bumped to 32px here rather than carried forward as-is.
 *
 * Built on the `Button` primitive (icon size + focus-visible ring already
 * match the rest of the library) rather than a bespoke `<button>`, since
 * `rounded-full` plus a size override composes cleanly with `buttonVariants`.
 */
export const ChatSendButton = forwardRef<HTMLButtonElement, ChatSendButtonProps>(
  ({ state = "send", labels, className, ...props }, ref) => {
    const l = { ...DEFAULT_SEND_LABELS, ...labels };
    const isStop = state === "stop";
    return (
      <Button
        ref={ref}
        type="button"
        size="icon"
        aria-label={isStop ? l.stop : l.send}
        data-slot="chat-send-button"
        data-state={state}
        className={cn("size-10 shrink-0 rounded-full md:size-8", className)}
        {...props}
      >
        {isStop ? (
          <Square aria-hidden="true" className="size-3.5" fill="currentColor" />
        ) : (
          <ArrowUp aria-hidden="true" className="size-4" />
        )}
      </Button>
    );
  },
);
ChatSendButton.displayName = "ChatSendButton";
