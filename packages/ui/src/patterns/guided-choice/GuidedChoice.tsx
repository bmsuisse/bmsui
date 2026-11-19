import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { type FormEvent, type FormHTMLAttributes, type ReactNode, useId, useState } from "react";
import { useHotkeys } from "../../hooks/useHotkeys";
import { getI18n, type IntegratedI18n, useLabels } from "../../i18n/locale";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { Kbd } from "../kbd/Kbd";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";

export interface GuidedChoiceOption {
  value: string;
  /** Accessible name of the option, e.g. the product name. */
  label: string;
  /** The card body: image, ids, price, why it matched. Keep popups and links out of it, the whole card is clickable. */
  content?: ReactNode;
  /** The proposal: badged and checked at first unless `defaultValue` says otherwise. */
  suggested?: boolean;
  disabled?: boolean;
}

export interface GuidedChoiceLabels {
  confirm: string;
  suggested: string;
  /** Group name of the options. */
  options: string;
  /** Shown on the busy confirm button. */
  working: string;
}

export const guidedChoiceLabelsFor = ({ t }: IntegratedI18n): GuidedChoiceLabels => ({
  confirm: t("guidedChoice.confirm"),
  suggested: t("guidedChoice.suggested"),
  options: t("guidedChoice.options"),
  working: t("guidedChoice.working"),
});

export const defaultGuidedChoiceLabels: GuidedChoiceLabels = guidedChoiceLabelsFor(getI18n("en", false));

export interface GuidedChoiceProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "title" | "onSubmit"> {
  title: ReactNode;
  /** What is being decided, e.g. the supplier's line. Shown above the options. */
  question?: ReactNode;
  options: ReadonlyArray<GuidedChoiceOption>;
  /** Checked at first; defaults to the suggested option. Remount (`key`) to start the next step fresh. */
  defaultValue?: string;
  onConfirm: (value: string) => void;
  /** The confirmation is being sent: disables the form. */
  pending?: boolean;
  /** Further ways out next to Confirm, e.g. "Skip" or "Keep as one-time article". */
  actions?: ReactNode;
  /** Number keys 1-9 check an option while this is mounted. Turn off when the page has its own. @default true */
  shortcuts?: boolean;
  labels?: Partial<GuidedChoiceLabels>;
}

/**
 * One step of a guided review: a question, a few option cards (one may be the
 * suggestion), Confirm. Arrow keys or 1-9 move the choice, Enter confirms.
 * Built on Base UI's radio group; the caller owns the steps and the network call.
 */
export function GuidedChoice({
  title,
  question,
  options,
  defaultValue,
  onConfirm,
  pending = false,
  actions,
  shortcuts = true,
  labels,
  className,
  ...props
}: GuidedChoiceProps) {
  const l = useLabels(guidedChoiceLabelsFor, labels);
  const titleId = useId();
  const [value, setValue] = useState<string | null>(
    defaultValue ?? options.find((option) => option.suggested)?.value ?? null,
  );
  useHotkeys(
    options.slice(0, 9).map((option, index) => ({
      keys: String(index + 1),
      handler: () => setValue(option.value),
      enabled: !option.disabled,
    })),
    { enabled: shortcuts && !pending },
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value != null) onConfirm(value);
  };
  return (
    <form
      aria-labelledby={titleId}
      onSubmit={submit}
      className={cn("@container/guided-choice grid min-w-0 gap-3 text-sm", className)}
      {...props}
    >
      <h3 id={titleId} className="font-semibold [overflow-wrap:anywhere]">
        {title}
      </h3>
      {question ? (
        <div className="min-w-0 rounded-xl border border-foreground/10 bg-muted/40 p-3 dark:border-border">{question}</div>
      ) : null}
      <fieldset disabled={pending} className="contents">
        <RadioGroup<string | null>
          value={value}
          onValueChange={setValue}
          disabled={pending}
          aria-label={l.options}
          // A radio is not a text field, so Enter would not submit the form on its own.
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.closest("form")?.requestSubmit();
          }}
          className="grid min-w-0 gap-2 @[40rem]/guided-choice:grid-cols-3"
        >
          {options.map((option, index) => (
            <ChoiceCard
              key={option.value}
              option={option}
              number={index + 1}
              shortcut={shortcuts && index < 9}
              suggestedLabel={l.suggested}
            />
          ))}
        </RadioGroup>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={value == null} className="max-sm:h-10 max-sm:flex-1">
            {pending ? <LoadingSpinner size="sm" className="text-inherit" label={l.working} /> : l.confirm}
            {pending ? null : <Kbd size="sm">↵</Kbd>}
          </Button>
          {actions}
        </div>
      </fieldset>
    </form>
  );
}

function ChoiceCard({
  option,
  number,
  shortcut,
  suggestedLabel,
}: {
  option: GuidedChoiceOption;
  number: number;
  shortcut: boolean;
  suggestedLabel: string;
}) {
  return (
    <label
      data-suggested={option.suggested ? "" : undefined}
      className={cn(
        "flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-xl border border-foreground/10 bg-background p-3 transition-colors dark:border-border",
        "hover:border-primary/40 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/[0.04] dark:has-[[data-checked]]:border-ring",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-background",
        "has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50",
      )}
    >
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {shortcut ? <Kbd size="sm">{number}</Kbd> : null}
        {option.suggested ? (
          <span className="rounded-full bg-primary/10 px-2 py-px font-semibold text-primary dark:text-ring">{suggestedLabel}</span>
        ) : null}
        <Radio.Root
          value={option.value}
          disabled={option.disabled}
          aria-label={option.label}
          aria-keyshortcuts={shortcut ? String(number) : undefined}
          className="ml-auto grid size-4 shrink-0 place-items-center rounded-full border border-foreground/30 outline-none data-[checked]:border-primary dark:data-[checked]:border-ring"
        >
          <Radio.Indicator className="size-2 rounded-full bg-primary dark:bg-ring" />
        </Radio.Root>
      </span>
      <span className="block font-medium [overflow-wrap:anywhere]">{option.label}</span>
      {option.content ? <div className="min-w-0 text-muted-foreground [overflow-wrap:anywhere]">{option.content}</div> : null}
    </label>
  );
}
