import { CheckIcon, ClipboardDocumentIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { type ReactNode, forwardRef, useEffect, useRef, useState } from "react";
import { announce } from "../../hooks/useAnnounce";
import { useClipboard } from "../../hooks/useClipboard";
import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "../../primitives/button";

export interface CopyButtonLabels {
  label: string;
  copied: string;
  failed: string;
}

export const defaultCopyButtonLabels: CopyButtonLabels = {
  label: "Copy",
  copied: "Copied",
  failed: "Copy failed. Try again.",
};

export interface CopyButtonProps extends Omit<ButtonProps, "value" | "onClick" | "onCopy" | "asChild" | "children" | "size"> {
  /** The text to copy. */
  value: string;
  /** Idle accessible name / tooltip. Overrides `labels.label`. */
  label?: string;
  copiedLabel?: string;
  failedLabel?: string;
  labels?: Partial<CopyButtonLabels>;
  /** `sm` (28px icon button, default) or `md` (36px). */
  size?: "sm" | "md";
  /** Visible text next to the icon. Without it the button is icon-only and `label` names it. */
  children?: ReactNode;
  /** How long the copied/failed state shows, ms. @default 2000 */
  timeout?: number;
  /** Called after a successful copy. */
  onCopy?: (value: string) => void;
}

const ICON =
  "absolute inset-0 m-auto size-4 transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none";
const show = (on: boolean) => (on ? "scale-100 opacity-100" : "scale-75 opacity-0 motion-reduce:scale-100");

/**
 * Icon button that copies a value (an id, a key, a link) and confirms it: the
 * clipboard icon flips to a check, the accessible name changes and the result
 * is announced to screen readers. Falls back to `execCommand` without the async
 * Clipboard API (see `useClipboard`).
 */
export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      value,
      label,
      copiedLabel,
      failedLabel,
      labels,
      size = "sm",
      children,
      timeout = 2000,
      onCopy,
      className,
      variant = "ghost",
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultCopyButtonLabels, ...labels };
    const idle = label ?? l.label;
    const done = copiedLabel ?? l.copied;
    const bad = failedLabel ?? l.failed;
    const { copy, copied, reset } = useClipboard({ timeout });
    const [failed, setFailed] = useState(false);
    const failTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(
      () => () => {
        if (failTimer.current !== null) clearTimeout(failTimer.current);
      },
      [],
    );

    const state = copied ? "copied" : failed ? "failed" : "idle";
    const name = state === "copied" ? done : state === "failed" ? bad : idle;
    const text = children ? (state === "idle" ? children : name) : null;

    const handle = async () => {
      if (failTimer.current !== null) clearTimeout(failTimer.current);
      setFailed(false);
      reset();
      const ok = await copy(value);
      if (ok) {
        onCopy?.(value);
        announce(done);
      } else {
        setFailed(true);
        announce(bad, { politeness: "assertive" });
        failTimer.current = setTimeout(() => setFailed(false), timeout);
      }
    };

    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={text ? (size === "sm" ? "xs" : "default") : size === "sm" ? "icon-xs" : "icon"}
        aria-label={text ? undefined : name}
        title={text ? undefined : name}
        data-state={state}
        onClick={() => void handle()}
        className={cn("text-muted-foreground hover:text-foreground", className)}
        {...props}
      >
        <span aria-hidden="true" className="relative inline-block size-4 shrink-0">
          <ClipboardDocumentIcon className={cn(ICON, show(state === "idle"))} />
          <CheckIcon className={cn(ICON, "text-emerald-700 dark:text-emerald-300", show(state === "copied"))} />
          <ExclamationCircleIcon className={cn(ICON, "text-red-700 dark:text-red-300", show(state === "failed"))} />
        </span>
        {text}
      </Button>
    );
  },
);
CopyButton.displayName = "CopyButton";
