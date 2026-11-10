import { ArrowUpTrayIcon, DocumentIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { forwardRef, useId, useRef, useState } from "react";
import { cn } from "../../lib/utils";

export interface FileInputLabels {
  /** Main line in the drop zone with `multiple`. */
  prompt: string;
  /** Main line in the drop zone without `multiple`. */
  promptSingle: string;
  /** Shown while files are dragged over. */
  dropHere: string;
  /** Prefix of the remove button's accessible name: "Remove report.pdf". */
  remove: string;
  /** Error for a file over `maxSize`. */
  tooLarge: (fileName: string, maxSize: string) => string;
  /** Error for a file not matching `accept`. */
  wrongType: (fileName: string) => string;
  /** Error when more than `maxFiles` would be selected. */
  tooMany: (maxFiles: number) => string;
}

export const defaultFileInputLabels: FileInputLabels = {
  prompt: "Drop files here or click to browse",
  promptSingle: "Drop a file here or click to browse",
  dropHere: "Drop to add",
  remove: "Remove",
  tooLarge: (name, max) => `${name} is larger than ${max}.`,
  wrongType: (name) => `${name} is not an accepted file type.`,
  tooMany: (max) => `At most ${max} ${max === 1 ? "file" : "files"}.`,
};

/** Why a file was not added. */
export interface FileRejection {
  file: File;
  reason: "too-large" | "wrong-type" | "too-many";
  message: string;
}

export interface FileInputProps {
  /** Selected files (controlled). */
  files: File[];
  onFilesChange: (files: File[]) => void;
  /** Same syntax as `<input accept>`: `.pdf,.docx`, `image/*`, `application/pdf`. Also enforced on drop. */
  accept?: string;
  /** Allow several files; picks and drops are appended. Without it a new file replaces the old one. */
  multiple?: boolean;
  /** Max bytes per file. */
  maxSize?: number;
  /** Max number of files (with `multiple`). */
  maxFiles?: number;
  /** Called with the files that were refused (they are also listed as errors under the zone). */
  onReject?: (rejections: FileRejection[]) => void;
  /** Second line in the drop zone, e.g. "PDF or Word, up to 10 MB". */
  hint?: ReactNode;
  disabled?: boolean;
  /** Form field name on the native file input (only reflects files picked via the dialog, not drops). */
  name?: string;
  /** Hide the file list (render your own from `files`). */
  hideFileList?: boolean;
  /** `sm`: a single-row zone (h-9) for tight forms. @default "default" */
  size?: "sm" | "default";
  labels?: Partial<FileInputLabels>;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
  "data-testid"?: string;
}

/** `12.3 KB`, `4.5 MB` (1024-based, the way file managers show it). */
export function formatFileSize(bytes: number, locale = "de-CH"): string {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let unit = 0;
  while (n >= 1024 && unit < units.length - 1) {
    n /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(n)} ${units[unit]}`;
}

/** Does `file` match an `accept` string (extensions, exact MIME types, `type/*`)? */
export function matchesAccept(file: File, accept?: string): boolean {
  if (!accept?.trim()) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return accept
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) =>
      rule.startsWith(".") ? name.endsWith(rule) : rule.endsWith("/*") ? type.startsWith(rule.slice(0, -1)) : type === rule,
    );
}

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/**
 * Drop zone + file list for picking files: click (or Enter/Space) opens the
 * file dialog, files can be dragged in, `accept`/`maxSize`/`maxFiles` refuse
 * files with a visible error, and each selected file has a remove button.
 * Controlled via `files`. Uploading is up to the caller. The native input
 * stays in the tab order through the zone itself (role="button").
 */
export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      files,
      onFilesChange,
      accept,
      multiple = false,
      maxSize,
      maxFiles,
      onReject,
      hint,
      disabled = false,
      name,
      hideFileList = false,
      size = "default",
      labels,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultFileInputLabels, ...labels };
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const dragDepth = useRef(0);
    const [errors, setErrors] = useState<string[]>([]);
    const errorId = useId();
    const testId = props["data-testid"];

    const add = (incoming: File[]) => {
      if (disabled || incoming.length === 0) return;
      const rejections: FileRejection[] = [];
      let accepted = incoming.filter((file) => {
        if (!matchesAccept(file, accept)) {
          rejections.push({ file, reason: "wrong-type", message: l.wrongType(file.name) });
          return false;
        }
        if (maxSize != null && file.size > maxSize) {
          rejections.push({ file, reason: "too-large", message: l.tooLarge(file.name, formatFileSize(maxSize)) });
          return false;
        }
        return true;
      });
      let next: File[];
      if (multiple) {
        next = [...files, ...accepted.filter((file) => !files.some((f) => sameFile(f, file)))];
        if (maxFiles != null && next.length > maxFiles) {
          next.slice(maxFiles).forEach((file) => rejections.push({ file, reason: "too-many", message: l.tooMany(maxFiles) }));
          next = next.slice(0, maxFiles);
        }
      } else {
        accepted = accepted.slice(0, 1);
        next = accepted.length ? accepted : files;
        if (incoming.length > 1 && accepted.length) {
          incoming.slice(1).forEach((file) => {
            if (!rejections.some((r) => r.file === file)) rejections.push({ file, reason: "too-many", message: l.tooMany(1) });
          });
        }
      }
      // One "too many" line is enough.
      const messages = [...new Set(rejections.map((r) => r.message))];
      setErrors(messages);
      if (rejections.length) onReject?.(rejections);
      if (next !== files) onFilesChange(next);
    };

    const open = () => {
      if (!disabled) inputRef.current?.click();
    };

    const onDrag = (e: DragEvent<HTMLDivElement>, kind: "enter" | "over" | "leave" | "drop") => {
      if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
      e.preventDefault();
      if (disabled) return;
      if (kind === "enter") {
        dragDepth.current += 1;
        setDragOver(true);
      } else if (kind === "leave") {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragOver(false);
      } else if (kind === "over") {
        e.dataTransfer.dropEffect = "copy";
      } else {
        dragDepth.current = 0;
        setDragOver(false);
        add(Array.from(e.dataTransfer.files ?? []));
      }
    };

    const sm = size === "sm";

    return (
      <div className={cn("flex w-full flex-col gap-2", className)} data-testid={testId ?? "file-input"}>
        {/* A div with role="button", not a <button>: the file <input> must live inside the drop target and can't nest in a button. */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          id={id}
          aria-disabled={disabled || undefined}
          aria-describedby={[props["aria-describedby"], errors.length ? errorId : null].filter(Boolean).join(" ") || undefined}
          data-drag-over={dragOver || undefined}
          data-testid={testId ? `${testId}-dropzone` : undefined}
          onClick={open}
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open();
            }
          }}
          onDragEnter={(e) => onDrag(e, "enter")}
          onDragOver={(e) => onDrag(e, "over")}
          onDragLeave={(e) => onDrag(e, "leave")}
          onDrop={(e) => onDrag(e, "drop")}
          className={cn(
            "flex cursor-pointer items-center rounded-md border border-dashed border-muted-foreground/35 bg-background text-sm transition-colors",
            "hover:border-muted-foreground/60 hover:bg-muted-foreground/5",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            sm ? "h-9 gap-2 px-3" : "flex-col justify-center gap-2 px-6 py-6 text-center",
            dragOver && "border-solid border-ring bg-accent/10 hover:border-ring hover:bg-accent/10",
            errors.length > 0 && !dragOver && "border-destructive/60",
            disabled && "pointer-events-none cursor-not-allowed opacity-50",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full transition-colors",
              sm ? "" : "h-10 w-10 bg-muted-foreground/10",
              dragOver ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <ArrowUpTrayIcon aria-hidden="true" className={sm ? "h-4 w-4" : "h-5 w-5"} />
          </span>
          <span className={cn("min-w-0", sm && "flex items-baseline gap-2 truncate")}>
            <span className="font-medium text-foreground">{dragOver ? l.dropHere : multiple ? l.prompt : l.promptSingle}</span>
            {hint ? (
              <span className={cn("text-xs text-muted-foreground", sm ? "truncate" : "mt-0.5 block")}>{hint}</span>
            ) : null}
          </span>
          <input
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
            }}
            type="file"
            name={name}
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            data-testid={testId ? `${testId}-native` : undefined}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              add(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>
        {errors.length ? (
          <ul id={errorId} role="alert" className="grid gap-0.5 text-xs text-destructive">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
        {!hideFileList && files.length ? (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5" data-testid={testId ? `${testId}-list` : undefined}>
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                className="flex h-9 items-center gap-2 rounded-md border border-input bg-background pl-3 pr-1 text-sm shadow-sm"
              >
                <DocumentIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-foreground" title={file.name}>
                  {file.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  aria-label={`${l.remove} ${file.name}`}
                  disabled={disabled}
                  onClick={() => {
                    setErrors([]);
                    onFilesChange(files.filter((_, i) => i !== index));
                  }}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <XMarkIcon aria-hidden="true" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  },
);
FileInput.displayName = "FileInput";
