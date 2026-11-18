import {
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  forwardRef,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/utils";
import { Chip } from "../chip/Chip";

export interface EmailSuggestion {
  email: string;
  name?: string;
}

export interface EmailAddressInputLabels {
  /** Accessible name of a chip's remove button. */
  remove: (email: string) => string;
  placeholder: string;
  /** Shown (and linked via `aria-describedby`) while the value holds an invalid address. */
  invalidAddress: string;
  /** Shown once `maxItems` addresses are in. */
  maxReached: (max: number) => string;
  /** Accessible name of the suggestion list. */
  suggestions: string;
}

export const defaultEmailAddressInputLabels: EmailAddressInputLabels = {
  remove: (email) => `Remove ${email}`,
  placeholder: "Add address…",
  invalidAddress: "Check the highlighted addresses.",
  maxReached: (max) => `At most ${max} addresses.`,
  suggestions: "Suggested addresses",
};

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;.]+(?:\.[^\s@<>,;.]+)+$/;

/** True for a plain `local@domain.tld` address (no display name, no spaces). */
export function isValidEmail(text: string): boolean {
  return EMAIL_RE.test(text.trim());
}

interface Token {
  email: string;
  name?: string;
}

const TOKEN_RE = /([^<>,;]*?)<([^<>\s]+)>|[^\s,;<>]+/g;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(TOKEN_RE)) {
    if (match[2]) {
      const name = (match[1] ?? "").trim().replace(/^"|"$/g, "").trim();
      tokens.push({ email: match[2].trim(), name: name || undefined });
    } else {
      tokens.push({ email: match[0].trim() });
    }
  }
  return tokens;
}

/**
 * Splits pasted/typed text on `,` `;` and whitespace (also understands `Name <a@b.ch>`)
 * into valid and invalid bare addresses, in order of appearance, duplicates removed.
 */
export function parseEmailAddresses(text: string): { valid: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const { email } of tokenize(text)) {
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    (isValidEmail(email) ? valid : invalid).push(email);
  }
  return { valid, invalid };
}

export interface EmailAddressInputProps {
  /** Controlled addresses (invalid ones included, shown as danger chips). */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Error text under the field; overrides the built-in invalid-address message. */
  error?: ReactNode;
  maxItems?: number;
  /** Autocomplete list under the field, filtered by what is typed. */
  suggestions?: EmailSuggestion[];
  labels?: Partial<EmailAddressInputLabels>;
  /** Put on the text input so `FormField`/`<label htmlFor>` reach it. */
  id?: string;
  /** Renders a hidden input with the comma-joined addresses, for native form posts. */
  name?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * To/Cc/Bcc field: addresses become chips as you type (Enter, comma, semicolon, space, Tab or
 * blur), paste splits a whole list. Invalid addresses stay in `value` as red chips so nothing
 * typed is lost; the caller decides whether to block sending. Pair with `FormField` for the label.
 */
export const EmailAddressInput = forwardRef<HTMLInputElement, EmailAddressInputProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      placeholder,
      disabled = false,
      invalid = false,
      error,
      maxItems,
      suggestions,
      labels,
      id,
      name,
      className,
      "aria-describedby": describedByProp,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "data-testid": testId,
    },
    ref,
  ) => {
    const l = { ...defaultEmailAddressInputLabels, ...labels };
    const uid = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
    const [inner, setInner] = useState<string[]>(defaultValue ?? []);
    const controlled = valueProp !== undefined;
    const value = controlled ? valueProp : inner;
    const [text, setText] = useState("");
    const [focused, setFocused] = useState(false);
    const [active, setActive] = useState(-1);
    const names = useRef(new Map<string, string>());

    const setValue = (next: string[]) => {
      if (!controlled) setInner(next);
      onValueChange?.(next);
    };

    const full = maxItems !== undefined && value.length >= maxItems;

    const commit = (raw: string) => {
      const tokens = tokenize(raw);
      if (tokens.length === 0) return;
      const next = [...value];
      const known = new Set(next.map((v) => v.toLowerCase()));
      for (const token of tokens) {
        if (maxItems !== undefined && next.length >= maxItems) break;
        const key = token.email.toLowerCase();
        if (known.has(key)) continue;
        known.add(key);
        next.push(token.email);
        if (token.name) names.current.set(key, token.name);
      }
      if (next.length !== value.length) setValue(next);
    };

    const commitText = () => {
      if (text.trim()) commit(text);
      setText("");
      setActive(-1);
    };

    const remove = (email: string) => {
      setValue(value.filter((v) => v !== email));
      inputRef.current?.focus();
    };

    const matches = useMemo(() => {
      const q = text.trim().toLowerCase();
      if (!suggestions || !q) return [];
      const taken = new Set(value.map((v) => v.toLowerCase()));
      return suggestions
        .filter((s) => !taken.has(s.email.toLowerCase()) && `${s.email} ${s.name ?? ""}`.toLowerCase().includes(q))
        .slice(0, 8);
    }, [suggestions, text, value]);
    const listOpen = focused && !disabled && !full && matches.length > 0;

    const pick = (s: EmailSuggestion) => {
      commit(`${s.name ? `${s.name} ` : ""}<${s.email}>`);
      setText("");
      setActive(-1);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (listOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((i) => (i + step + matches.length) % matches.length);
        return;
      }
      if (event.key === "Escape" && listOpen) {
        event.preventDefault();
        setText("");
        setActive(-1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const picked = listOpen ? matches[active] : undefined;
        if (picked) pick(picked);
        else commitText();
      } else if (event.key === "," || event.key === ";" || event.key === " ") {
        if (text.trim()) {
          event.preventDefault();
          commitText();
        } else {
          event.preventDefault();
        }
      } else if (event.key === "Tab") {
        if (text.trim()) {
          event.preventDefault();
          commitText();
        }
      } else if (event.key === "Backspace" && text === "" && value.length > 0) {
        event.preventDefault();
        setValue(value.slice(0, -1));
      }
    };

    const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
      const pasted = event.clipboardData.getData("text");
      if (!pasted) return;
      event.preventDefault();
      commit(text + pasted);
      setText("");
    };

    const hasInvalid = value.some((v) => !isValidEmail(v));
    const isInvalid = invalid || hasInvalid || Boolean(error);
    const message = error ?? (hasInvalid ? l.invalidAddress : null);
    const messageId = `${uid}-msg`;
    const hintId = `${uid}-hint`;
    const listId = `${uid}-list`;
    const describedBy =
      [describedByProp, message ? messageId : null, full ? hintId : null].filter(Boolean).join(" ") || undefined;

    return (
      <div className={cn("min-w-0", className)} data-testid={testId}>
        <div
          role="group"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          data-invalid={isInvalid || undefined}
          onClick={() => inputRef.current?.focus()}
          className={cn(
            "relative flex min-h-9 w-full min-w-0 cursor-text flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background",
            isInvalid && "border-red-700 dark:border-red-300",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {value.map((email) => {
            const bad = !isValidEmail(email);
            return (
              <Chip
                key={email}
                size="sm"
                disabled={disabled}
                title={names.current.get(email.toLowerCase()) ?? email}
                data-invalid={bad || undefined}
                onRemove={() => remove(email)}
                removeLabel={l.remove(email)}
                className={cn(
                  "max-w-full",
                  bad &&
                    "border-red-700/40 bg-red-50 text-red-700 dark:border-red-300/40 dark:bg-red-950/40 dark:text-red-300",
                )}
              >
                {email}
              </Chip>
            );
          })}
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={text}
            disabled={disabled || full}
            placeholder={value.length === 0 ? (placeholder ?? l.placeholder) : undefined}
            aria-invalid={isInvalid || undefined}
            aria-describedby={describedBy}
            role={suggestions ? "combobox" : undefined}
            aria-expanded={suggestions ? listOpen : undefined}
            aria-controls={suggestions && listOpen ? listId : undefined}
            aria-autocomplete={suggestions ? "list" : undefined}
            aria-activedescendant={listOpen && active >= 0 ? `${listId}-${active}` : undefined}
            onChange={(event) => {
              const next = event.target.value;
              if (/[,;\s]$/.test(next) && next.trim()) {
                commit(next);
                setText("");
              } else setText(next);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commitText();
            }}
            className="h-6 min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          {listOpen ? (
            <ul
              id={listId}
              role="listbox"
              aria-label={l.suggestions}
              className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-foreground/10 bg-popover p-1 text-popover-foreground shadow-md dark:border-border"
            >
              {matches.map((s, i) => (
                <li
                  key={s.email}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-sm px-2 py-1.5 text-sm [overflow-wrap:anywhere] pointer-coarse:min-h-10",
                    i === active && "bg-foreground/6",
                  )}
                >
                  {s.name ? <span className="font-medium">{s.name}</span> : null}
                  <span className={s.name ? "text-xs text-muted-foreground" : undefined}>{s.email}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {name ? <input type="hidden" name={name} value={value.join(",")} /> : null}
        {message ? (
          <p id={messageId} className="mt-1 text-xs text-red-700 dark:text-red-300">
            {message}
          </p>
        ) : null}
        {full && maxItems !== undefined ? (
          <p id={hintId} role="status" className="mt-1 text-xs text-muted-foreground">
            {l.maxReached(maxItems)}
          </p>
        ) : null}
      </div>
    );
  },
);
EmailAddressInput.displayName = "EmailAddressInput";
