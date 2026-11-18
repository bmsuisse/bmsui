import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  DocumentTextIcon,
  PaperClipIcon,
  PhotoIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/16/solid";
import { type ElementType, type HTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";
import { formatFileSize } from "../file-input/FileInput";
import { getI18n, useFormatLocale, useLabels } from "../../i18n/locale";
import type { IntegratedI18n } from "../../i18n/locale";

export interface AttachmentItem {
  id: string;
  name: string;
  /** Size in bytes. */
  size?: number;
  mimeType?: string;
  /** Download URL; the row becomes a link. */
  href?: string;
  /** Preview image shown instead of the type icon. */
  thumbnailUrl?: string;
}

export interface AttachmentListLabels {
  /** Header text, e.g. "3 attachments". */
  attachments: (count: number) => string;
  /** Accessible name prefix of the download link, the file name is appended. */
  download: string;
  /** Accessible name of the download link for one file; default `"{download}: {name}"`. */
  downloadFile?: (name: string) => string;
  /** File size units, 1024-based: bytes, kilo, mega, giga. */
  sizeUnits: readonly [string, string, string, string];
  /** Accessible name of the remove button for one file. */
  remove: (name: string) => string;
}

export const attachmentListLabelsFor = ({ t }: IntegratedI18n): AttachmentListLabels => ({
  attachments: (n) => t("attachmentList.attachments", { count: n }),
  download: t("attachmentList.download"),
  downloadFile: (name) => t("attachmentList.downloadFile", { name }),
  remove: (name) => t("attachmentList.remove", { name }),
  sizeUnits: ["B", "KB", "MB", "GB"],
});

export const defaultAttachmentListLabels: AttachmentListLabels = attachmentListLabelsFor(getI18n("en", false));

function iconFor(mime = "", name = ""): ElementType {
  const m = mime.toLowerCase();
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (m.startsWith("image/")) return PhotoIcon;
  if (m === "application/pdf" || ext === "pdf") return DocumentTextIcon;
  if (/(sheet|excel|csv)/.test(m) || ["xls", "xlsx", "csv", "ods"].includes(ext)) return TableCellsIcon;
  if (/(word|document|text\/)/.test(m) || ["doc", "docx", "odt", "txt", "rtf"].includes(ext)) return DocumentTextIcon;
  if (/(zip|compressed|tar|rar|7z)/.test(m) || ["zip", "rar", "7z", "tar", "gz"].includes(ext)) return ArchiveBoxIcon;
  return DocumentIcon;
}

export interface AttachmentListProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  attachments: AttachmentItem[];
  /** Compose mode: shows a remove button per file. */
  onRemove?: (id: string) => void;
  /** `list` (default) rows with size, `chips` compact pills. */
  layout?: "list" | "chips";
  /** BCP 47 locale for the file size. @default "de-CH" */
  locale?: string;
  labels?: Partial<AttachmentListLabels>;
}

/**
 * Files attached to a message: paperclip header with count, type icon (or thumbnail),
 * name, size, download link and, in compose mode, a remove button. Long names wrap.
 */
export const AttachmentList = forwardRef<HTMLElement, AttachmentListProps>(
  ({ attachments, onRemove, layout = "list", locale: localeProp, labels, className, ...props }, ref) => {
    const l = useLabels(attachmentListLabelsFor, labels);
    const downloadFile = labels?.downloadFile ?? (labels?.download === undefined ? l.downloadFile : undefined);
    const locale = useFormatLocale(localeProp);
    if (attachments.length === 0) return null;
    const chips = layout === "chips";
    const shape = chips ? "rounded-[var(--radius-pill,9999px)]" : "rounded-md";
    return (
      <section ref={ref} aria-label={l.attachments(attachments.length)} className={cn("min-w-0 text-sm", className)} {...props}>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <PaperClipIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{l.attachments(attachments.length)}</span>
        </div>
        <ul className={cn("min-w-0", "flex flex-wrap", chips ? "gap-2" : "gap-1.5")}>
          {attachments.map((a) => {
            const Icon = iconFor(a.mimeType, a.name);
            const size = a.size !== undefined ? formatFileSize(a.size, locale, l.sizeUnits) : "";
            const body = (
              <>
                {a.thumbnailUrl ? (
                  <img src={a.thumbnailUrl} alt="" className="h-8 w-8 shrink-0 rounded-sm object-cover" />
                ) : (
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  <span className="text-foreground">{a.name}</span>
                  {size ? <span className="ml-1.5 whitespace-nowrap text-xs text-muted-foreground">{size}</span> : null}
                </span>
                {a.href ? <ArrowDownTrayIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
              </>
            );
            const box = cn("flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5", shape);
            return (
              <li
                key={a.id}
                className={cn("flex min-w-0 max-w-full items-center border border-foreground/10 dark:border-border", shape)}
              >
                {a.href ? (
                  <a
                    href={a.href}
                    download
                    aria-label={downloadFile ? downloadFile(a.name) : `${l.download}: ${a.name}`}
                    className={cn(
                      box,
                      "hover:bg-foreground/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    )}
                  >
                    {body}
                  </a>
                ) : (
                  <div className={box}>{body}</div>
                )}
                {onRemove ? (
                  <button
                    type="button"
                    aria-label={l.remove(a.name)}
                    onClick={() => onRemove(a.id)}
                    className="mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-pill,9999px)] text-muted-foreground hover:bg-foreground/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 pointer-coarse:h-8 pointer-coarse:w-8"
                  >
                    <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    );
  },
);
AttachmentList.displayName = "AttachmentList";
