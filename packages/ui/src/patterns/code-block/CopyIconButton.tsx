import { CheckIcon, ClipboardDocumentIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { announce } from "../../hooks/useAnnounce";
import { useClipboard } from "../../hooks/useClipboard";
import { cn } from "../../lib/utils";

export interface CopyIconButtonLabels {
  copy: string;
  copied: string;
  copyFailed: string;
}

export const defaultCopyIconButtonLabels: CopyIconButtonLabels = {
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Copy failed",
};

const icon = "absolute h-4 w-4 transition-[scale,opacity] duration-150 ease-out motion-reduce:transition-none";

/** Internal: the small icon-only copy button shared by `CodeBlock`, `JsonView` and `ToolCallCard`. */
export const CopyIconButton = ({
  value,
  labels,
  label,
  className,
  testId,
}: {
  value: string;
  labels: CopyIconButtonLabels;
  /** Overrides `labels.copy` as the accessible name ("Copy JSON"). */
  label?: string;
  className?: string;
  testId?: string;
}): ReactElement => {
  const { copy, copied, error } = useClipboard();
  const name = error ? labels.copyFailed : copied ? labels.copied : (label ?? labels.copy);
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={name}
      title={name}
      onClick={async () => {
        const ok = await copy(value);
        announce(ok ? labels.copied : labels.copyFailed, { politeness: ok ? "polite" : "assertive" });
      }}
      className={cn(
        "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 motion-reduce:transition-none",
        className,
      )}
    >
      <ClipboardDocumentIcon
        aria-hidden="true"
        className={cn(icon, copied || error ? "scale-50 opacity-0" : "scale-100 opacity-100")}
      />
      <CheckIcon
        aria-hidden="true"
        className={cn(icon, "text-emerald-700 dark:text-emerald-300", copied && !error ? "scale-100 opacity-100" : "scale-50 opacity-0")}
      />
      <ExclamationTriangleIcon
        aria-hidden="true"
        className={cn(icon, "text-red-700 dark:text-red-300", error ? "scale-100 opacity-100" : "scale-50 opacity-0")}
      />
    </button>
  );
};
