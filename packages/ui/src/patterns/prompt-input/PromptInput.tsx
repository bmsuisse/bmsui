import { ArrowUpIcon, StopIcon } from "@heroicons/react/24/outline";
import {
  type FormEvent,
  type KeyboardEvent,
  type FormHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
  forwardRef,
  useRef,
  useState,
} from "react";
import { useMergedRefs } from "../../hooks/useMergedRefs";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { Textarea } from "../../primitives/textarea";

export interface PromptInputLabels {
  /** Accessible name of the text field. */
  message: string;
  placeholder: string;
  send: string;
  stop: string;
}

export const defaultPromptInputLabels: PromptInputLabels = {
  message: "Message",
  placeholder: "Write a message…",
  send: "Send",
  stop: "Stop",
};

export interface PromptInputProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "onChange" | "children"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Called with the trimmed text. The field is cleared afterwards, unless this returns `false`
   * (keep the draft, e.g. when validation fails). Not called while `streaming`, `disabled` or empty.
   */
  onSubmit?: (text: string) => void | false;
  /** `enter` (default): Enter sends, Shift+Enter is a newline. `mod-enter`: Ctrl/Cmd+Enter sends, Enter is a newline. */
  submitOn?: "enter" | "mod-enter";
  /** A reply is being generated: Send is replaced by Stop and submitting is blocked. */
  streaming?: boolean;
  onStop?: () => void;
  disabled?: boolean;
  /** Overrides `labels.placeholder`. */
  placeholder?: string;
  /** Grow up to this many lines, then scroll. Default `6`. */
  maxRows?: number;
  /** Chips/thumbnails of files above the text (render your own, with remove buttons). */
  attachments?: ReactNode;
  /** Left of the action row: attach button, model picker, mode toggle. */
  leading?: ReactNode;
  /** Right of the action row, before Send: voice input, AI helpers. */
  actions?: ReactNode;
  /** Extra props for the textarea (`maxLength`, `autoFocus`, `onPaste`, …). */
  textareaProps?: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange" | "disabled" | "rows">;
  textareaRef?: Ref<HTMLTextAreaElement>;
  labels?: Partial<PromptInputLabels>;
}

/**
 * Chat composer: auto-growing field with Send/Stop. Enter sends and Shift+Enter inserts a
 * newline (configurable); a keypress that confirms an IME candidate (Japanese, Chinese,
 * Korean) never sends. Controlled (`value`) or uncontrolled. The surface focuses its field
 * when clicked and respects the phone safe area through the page it sits in.
 */
export const PromptInput = forwardRef<HTMLFormElement, PromptInputProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onSubmit,
      submitOn = "enter",
      streaming = false,
      onStop,
      disabled = false,
      maxRows = 6,
      placeholder,
      attachments,
      leading,
      actions,
      textareaProps,
      textareaRef,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultPromptInputLabels, ...labels };
    const controlled = valueProp !== undefined;
    const [inner, setInner] = useState(defaultValue);
    const value = controlled ? valueProp : inner;
    const field = useRef<HTMLTextAreaElement>(null);
    const mergedField = useMergedRefs(field, textareaRef);

    const setValue = (next: string) => {
      if (!controlled) setInner(next);
      onValueChange?.(next);
    };

    const text = value.trim();
    const canSend = !disabled && !streaming && text.length > 0;

    const submit = () => {
      if (!canSend) return;
      if (onSubmit?.(text) !== false) setValue("");
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      textareaProps?.onKeyDown?.(event);
      if (event.defaultPrevented || event.key !== "Enter") return;
      // keyCode 229: Safari fires the confirming Enter after compositionend, with isComposing already false.
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      const wantsSubmit =
        submitOn === "enter" ? !event.shiftKey && !event.altKey : event.ctrlKey || event.metaKey;
      if (!wantsSubmit) return;
      event.preventDefault();
      submit();
    };

    const onFormSubmit = (event: FormEvent) => {
      event.preventDefault();
      submit();
    };

    return (
      <form
        ref={ref}
        onSubmit={onFormSubmit}
        onClick={(event) => {
          // Clicking the padding focuses the field; clicks on buttons and other controls keep their own focus.
          if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.promptSurface !== undefined) {
            field.current?.focus();
          }
        }}
        aria-disabled={disabled || undefined}
        className={cn(
          "flex min-w-0 cursor-text flex-col gap-1 rounded-2xl border border-foreground/10 bg-background p-2 shadow-sm transition-shadow dark:border-border",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
        {...props}
      >
        {attachments ? (
          <div data-prompt-surface="" className="flex flex-wrap gap-1.5 px-1 pt-1">
            {attachments}
          </div>
        ) : null}
        <Textarea
          {...textareaProps}
          ref={mergedField}
          autoResize
          maxRows={maxRows}
          value={value}
          disabled={disabled}
          aria-label={textareaProps?.["aria-label"] ?? l.message}
          placeholder={placeholder ?? textareaProps?.placeholder ?? l.placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            "min-h-10 border-0 bg-transparent px-2 py-2 text-base leading-6 shadow-none focus-visible:ring-0 sm:text-sm",
            textareaProps?.className,
          )}
        />
        <div data-prompt-surface="" className="flex items-center gap-1">
          {leading ? <div className="flex min-w-0 items-center gap-1">{leading}</div> : null}
          <div data-prompt-surface="" className="ml-auto flex shrink-0 items-center gap-1">
            {actions}
            {streaming ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-label={l.stop}
                title={l.stop}
                onClick={onStop}
                className="size-9 rounded-[var(--radius-pill,9999px)] bg-foreground/10 text-foreground hover:bg-foreground/15 sm:size-8"
              >
                <StopIcon className="!size-3.5 fill-current" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                aria-label={l.send}
                title={l.send}
                disabled={!canSend}
                className="size-9 rounded-[var(--radius-pill,9999px)] sm:size-8 dark:bg-accent dark:text-accent-foreground dark:hover:bg-accent/90"
              >
                <ArrowUpIcon className="stroke-[2.25]" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </form>
    );
  },
);
PromptInput.displayName = "PromptInput";
