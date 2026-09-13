import { AlertCircle, Download, FileText, Loader2, X } from "lucide-react";
import { forwardRef, useEffect, useState, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface FileAttachmentChipProps extends Omit<HTMLAttributes<HTMLDivElement>, "role"> {
  /** The file name, shown truncated with the extension preserved. */
  name: string;
  /** Byte size, formatted as e.g. "240 KB". Omit when unknown (a stream still arriving). */
  size?: number;
  /**
   * `attach`: a file the user is about to send — `onRemove` shows an `×`.
   * `export`: a file the assistant produced — `onDownload` shows a download
   * affordance instead, and there is no remove control since the message
   * that produced it isn't undone by dismissing the chip.
   * @default "attach"
   */
  variant?: "attach" | "export";
  /** @default "idle" */
  state?: "idle" | "uploading" | "error";
  /** 0-100, shown as a thin bar under the name while `state="uploading"`. */
  progress?: number;
  /** Shown in place of the size/progress line when `state="error"`. */
  error?: string;
  onRemove?: () => void;
  onDownload?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unit]}`;
}

/**
 * A single attached-or-produced file, rendered as a compact card — a chat
 * composer's attach row, a `FileDropzone`'s picked-files list, a document
 * upload panel, an inline "download the result" affordance. Two variants
 * because the two files have different lifecycles: an attachment can be
 * un-attached before it's sent/uploaded, an exported/produced file cannot
 * be "removed" without also undoing whatever generated it.
 */
export const FileAttachmentChip = forwardRef<HTMLDivElement, FileAttachmentChipProps>(
  (
    {
      name,
      size,
      variant = "attach",
      state = "idle",
      progress,
      error,
      onRemove,
      onDownload,
      className,
      ...props
    },
    ref,
  ) => {
    const uploading = state === "uploading";
    const errored = state === "error";

    // Mounts one frame below/faded-out, then transitions to its resting
    // position — the same rAF-driven pattern SheetContent uses, so a chip
    // arriving in a list (a file just dropped, an assistant reply just
    // finished) reads as *added* rather than popping in with the rest of
    // the render. Existing chips never re-run this (state lives per-mount).
    const [entered, setEntered] = useState(false);
    useEffect(() => {
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }, []);

    return (
      <div
        ref={ref}
        data-slot="file-attachment-chip"
        data-state={state}
        className={cn(
          "flex w-56 items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-sm transition-[opacity,transform] duration-200 ease-out",
          "motion-safe:translate-y-0 motion-safe:opacity-100",
          !entered && "motion-safe:translate-y-1 motion-safe:opacity-0",
          errored ? "border-destructive/30 bg-destructive/5" : "border-border/60",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            errored ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
          )}
        >
          {uploading ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : errored ? (
            <AlertCircle aria-hidden="true" className="size-4" />
          ) : (
            <FileText aria-hidden="true" className="size-4" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground" title={name}>
            {name}
          </span>
          {errored ? (
            <span className="block truncate text-xs text-destructive">{error ?? "Upload failed"}</span>
          ) : uploading ? (
            <span
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-1 block h-1 overflow-hidden rounded-full bg-muted"
            >
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress ?? 0))}%` }}
              />
            </span>
          ) : (
            <span className="block truncate text-xs text-muted-foreground">
              {size !== undefined ? formatBytes(size) : null}
            </span>
          )}
        </span>

        {variant === "attach" && onRemove && !uploading && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${name}`}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
        {variant === "export" && onDownload && (
          <button
            type="button"
            onClick={onDownload}
            aria-label={`Download ${name}`}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          >
            <Download aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>
    );
  },
);
FileAttachmentChip.displayName = "FileAttachmentChip";
