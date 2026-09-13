import { UploadCloud } from "lucide-react";
import { forwardRef, useId, useRef, type HTMLAttributes, type ReactNode } from "react";
import { useFileDropzone } from "../../lib/useFileDropzone";
import { cn } from "../../lib/utils";

export interface FileDropzoneProps extends Omit<HTMLAttributes<HTMLDivElement>, "onDrop"> {
  onFiles: (files: File[]) => void;
  /** Forwarded to the hidden `<input type="file">`, e.g. `".pdf,.docx"` or `"image/*"`. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** @default "Drag files here, or click to browse" */
  label?: ReactNode;
  /** Shown under `label` in smaller, muted text — e.g. accepted types or a size cap. */
  hint?: ReactNode;
}

/**
 * A standalone drop target for document upload/attach surfaces that aren't
 * `ChatComposer` — a form's supporting-documents field, a "replace this
 * file" panel, an import screen. It owns the whole affordance (border,
 * icon, click-to-browse) rather than just the dashed-border visual
 * `ChatComposer.dragging` renders, because outside a chat shell there is no
 * existing card for the state to live on — this component *is* the target.
 *
 * The file list itself is deliberately not rendered here: pair this with
 * `FileAttachmentChip` for the picked files, the same way `ChatComposer` +
 * `useFileDropzone` do — a caller that already has its own file-list UI (a
 * table, a form field's existing layout) isn't forced into this one.
 */
export const FileDropzone = forwardRef<HTMLDivElement, FileDropzoneProps>(
  ({ onFiles, accept, multiple = true, disabled, label, hint, className, ...props }, ref) => {
    const { dragging, handlers } = useFileDropzone((files) => {
      if (!disabled) onFiles(files);
    });
    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useId();

    return (
      <div
        ref={ref}
        data-slot="file-dropzone"
        data-dragging={dragging ? "" : undefined}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors",
          "hover:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragging && "border-ring bg-accent/40",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
          className,
        )}
        {...handlers}
        {...props}
      >
        <UploadCloud aria-hidden="true" className="size-6 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {label ?? "Drag files here, or click to browse"}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            onFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>
    );
  },
);
FileDropzone.displayName = "FileDropzone";
