import { ArrowUpTrayIcon, DocumentIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { forwardRef, useId, useRef, useState } from "react";
import { animate, EASE_IN, prefersReducedMotion } from "../../lib/motion";
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
  /** Locale for the file sizes ("1.5 MB" vs "1,5 MB"). @default "de-CH" */
  locale?: string;
  /** Hide the file list (render your own from `files`). */
  hideFileList?: boolean;
  /** `sm`: a single-row zone (h-9) for tight forms. @default "default" */
  size?: "sm" | "default";
  /** Rows fade/slide in when added and collapse out when removed; the zone lifts on drag-over. @default true */
  animated?: boolean;
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

// Stable per-File row keys: rows after a removed one must not remount (and replay their enter).
const fileKeys = new WeakMap<File, number>();
let nextFileKey = 0;
const fileKey = (file: File) => {
  let key = fileKeys.get(file);
  if (key == null) fileKeys.set(file, (key = nextFileKey++));
  return key;
};

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/**
 * Drop zone + file list for picking files: click (or Enter/Space) opens the
 * file dialog, files can be dragged in, `accept`/`maxSize`/`maxFiles` refuse
 * files with a visible error, and each selected file has a remove button.
 * Controlled via `files`. Uploading is up to the caller. The native input
 * stays in the tab order through the zone itself (role="button"). There is no
 * `name`: the native input is cleared after each pick, so it never carries the
 * files in a form submit — send `files` yourself (e.g. via `FormData`).
 *
 * Motion (`animated`, default on): the zone's border/tint cross-fade and it
 * lifts 2px with a soft ring while files are dragged over, the upload arrow
 * nudges up on hover, new rows fade and slide in (150 ms ease-out) and a
 * removed row fades and collapses (140 ms ease-in) as an inert ghost —
 * `onFilesChange` itself always fires immediately. With `prefers-reduced-motion` nothing moves and removal is instant.
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
      locale = "de-CH",
      hideFileList = false,
      size = "default",
      animated = true,
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
    const filesRef = useRef(files);
    filesRef.current = files;
    // Removed rows linger as inert "ghosts" for their collapse animation; the
    // parent's `files` (and `onFilesChange`) update immediately, never delayed.
    const [ghosts, setGhosts] = useState<{ file: File; index: number }[]>([]);

    const remove = (file: File) => {
      setErrors([]);
      const list = filesRef.current;
      const index = list.indexOf(file);
      if (index < 0) return;
      onFilesChange(list.filter((_, i) => i !== index));
      if (animated && !prefersReducedMotion()) setGhosts((g) => [...g, { file, index }]);
    };

    const collapseGhost = (el: HTMLLIElement | null, ghost: { file: File; index: number }) => {
      if (!el || el.dataset.collapsing) return;
      el.dataset.collapsing = "true";
      const drop = () => setGhosts((g) => g.filter((x) => x !== ghost));
      const animation = animate(
        el,
        [
          { opacity: 1, height: `${el.offsetHeight || 36}px` },
          // Swallow the 6px list gap next to the row as it collapses.
          { opacity: 0, height: "0px", marginTop: ghost.index > 0 ? "-6px" : "0px", marginBottom: ghost.index === 0 ? "-6px" : "0px" },
        ],
        { duration: 140, easing: EASE_IN, fill: "forwards" },
      );
      if (!animation) return drop();
      animation.onfinish = drop;
      animation.oncancel = drop;
    };

    const add = (incoming: File[]) => {
      if (disabled || incoming.length === 0) return;
      const rejections: FileRejection[] = [];
      let accepted = incoming.filter((file) => {
        if (!matchesAccept(file, accept)) {
          rejections.push({ file, reason: "wrong-type", message: l.wrongType(file.name) });
          return false;
        }
        if (maxSize != null && file.size > maxSize) {
          rejections.push({ file, reason: "too-large", message: l.tooLarge(file.name, formatFileSize(maxSize, locale)) });
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
        // Keep the first acceptable file; only the other acceptable ones are "too many".
        accepted.slice(1).forEach((file) => rejections.push({ file, reason: "too-many", message: l.tooMany(1) }));
        accepted = accepted.slice(0, 1);
        next = accepted.length ? accepted : files;
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
      // Prevent default even when disabled, or a dropped file makes the browser navigate to it.
      e.preventDefault();
      if (disabled) {
        if (kind === "over") e.dataTransfer.dropEffect = "none";
        return;
      }
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
            "group flex items-center rounded-md border border-dashed border-muted-foreground/35 bg-background text-sm transition-[color,background-color,border-color,box-shadow,translate] duration-150 ease-out",
            !disabled && "cursor-pointer hover:border-muted-foreground/60 hover:bg-muted-foreground/5",
            "focus-visible:border-solid focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            sm ? "h-9 gap-2 px-3" : "flex-col justify-center gap-2 px-6 py-6 text-center",
            dragOver && "border-solid border-ring bg-accent/10 ring-4 ring-ring/10 hover:border-ring hover:bg-accent/10",
            dragOver && animated && "-translate-y-0.5 shadow-md motion-reduce:translate-none!",
            errors.length > 0 && !dragOver && "border-destructive/60",
            // No pointer-events-none: the zone must keep receiving drag events to block drops.
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full transition-[color,background-color,translate] duration-150 ease-out",
              animated && !disabled && "group-hover:-translate-y-0.5 motion-reduce:translate-none!",
              animated && dragOver && "-translate-y-0.5 motion-reduce:translate-none!",
              sm ? "" : "h-10 w-10 bg-muted-foreground/10",
              dragOver ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
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
        {!hideFileList && (files.length || ghosts.length) ? (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5" data-testid={testId ? `${testId}-list` : undefined}>
            {withGhosts(files, ghosts).map((row, index) =>
              row.ghost ? (
                <li
                  key={`ghost-${fileKey(row.file)}-${row.ghost.index}`}
                  ref={(el) => collapseGhost(el, row.ghost!)}
                  aria-hidden="true"
                  className="pointer-events-none flex h-9 items-center gap-2 overflow-hidden rounded-md border border-input bg-background pl-3 pr-1 text-sm shadow-sm"
                >
                  <DocumentIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{row.file.name}</span>
                  <span className="shrink-0 pr-9 text-xs tabular-nums text-muted-foreground">{formatFileSize(row.file.size, locale)}</span>
                </li>
              ) : (
                <li
                  key={files.indexOf(row.file) === row.fileIndex ? fileKey(row.file) : `${fileKey(row.file)}-${row.fileIndex}`}
                  data-row={index}
                  className={cn(
                    "flex h-9 items-center gap-2 overflow-hidden rounded-md border border-input bg-background pl-3 pr-1 text-sm shadow-sm",
                    animated &&
                      "transition-[opacity,translate] duration-150 ease-out starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none",
                  )}
                >
                  <DocumentIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-foreground" title={row.file.name}>
                    {row.file.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatFileSize(row.file.size, locale)}</span>
                  <button
                    type="button"
                    aria-label={`${l.remove} ${row.file.name}`}
                    disabled={disabled}
                    onClick={() => remove(row.file)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,scale] duration-150 ease-out hover:bg-muted-foreground/10 hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 motion-reduce:scale-none!"
                  >
                    <XMarkIcon aria-hidden="true" className="h-4 w-4" />
                  </button>
                </li>
              ),
            )}
          </ul>
        ) : null}
      </div>
    );
  },
);
FileInput.displayName = "FileInput";

type ListRow =
  | { file: File; fileIndex: number; ghost?: undefined }
  | { file: File; fileIndex: -1; ghost: { file: File; index: number } };

/** The current files with collapsing ghosts slotted back in at the position they were removed from. */
function withGhosts(files: File[], ghosts: { file: File; index: number }[]): ListRow[] {
  const rows: ListRow[] = files.map((file, fileIndex) => ({ file, fileIndex }));
  for (const ghost of [...ghosts].sort((a, b) => a.index - b.index)) {
    rows.splice(Math.min(ghost.index, rows.length), 0, { file: ghost.file, fileIndex: -1, ghost });
  }
  return rows;
}
