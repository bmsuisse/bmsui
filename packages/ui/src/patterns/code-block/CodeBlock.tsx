import { type HTMLAttributes, type ReactNode, forwardRef, useMemo } from "react";
import { SCROLL_FOCUS_WRAPPER, SCROLL_REGION, useScrollFade } from "../../lib/scrollFade";
import { cn } from "../../lib/utils";
import { CopyIconButton, type CopyIconButtonLabels, defaultCopyIconButtonLabels } from "./CopyIconButton";

export interface CodeBlockLabels extends CopyIconButtonLabels {
  /** Accessible name of the code region when there is no `title`/`language`. */
  code: string;
}
export const defaultCodeBlockLabels: CodeBlockLabels = { ...defaultCopyIconButtonLabels, code: "Code" };

export interface CodeBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** The source text, shown and copied verbatim. */
  code: string;
  /** Shown in the header ("sql", "json"), and passed to `highlight`. */
  language?: string;
  /** Header title in place of the language (a file name, "Input"). */
  title?: ReactNode;
  /** Wrap long lines instead of scrolling sideways. Line numbers are off while wrapping. @default false */
  wrap?: boolean;
  /** Height cap in px or any CSS length; the body scrolls past it. @default none */
  maxHeight?: number | string;
  /** Number gutter (not shown with `wrap`). @default false */
  lineNumbers?: boolean;
  /** Copy button in the header. @default true */
  copyable?: boolean;
  /**
   * Inject a highlighter (shiki, prism, …) without this package depending on one. Its result is
   * rendered inside `<code>`; return plain nodes or spans. Without it the code is plain text.
   */
  highlight?: (code: string, language: string | undefined) => ReactNode;
  labels?: Partial<CodeBlockLabels>;
}

/**
 * A code or log snippet in a bordered block: language label, copy button, optional line numbers,
 * scrolls (or wraps) inside `maxHeight`. Bring your own highlighter through `highlight`.
 * For JSON values use `JsonView`; for a one-liner inside text use plain `<code>`.
 */
export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(
  (
    { code, language, title, wrap = false, maxHeight, lineNumbers = false, copyable = true, highlight, labels, className, ...props },
    ref,
  ) => {
    const l = { ...defaultCodeBlockLabels, ...labels };
    const lineCount = useMemo(() => code.split("\n").length, [code]);
    const gutter = lineNumbers && !wrap;
    const heading = title ?? language;
    const fade = useScrollFade<HTMLDivElement>();
    return (
      <div
        ref={ref}
        data-slot="code-block"
        className={cn(
          "min-w-0 max-w-full overflow-hidden rounded-lg border border-foreground/10 bg-foreground/[0.03] dark:border-border dark:bg-foreground/[0.06]",
          className,
        )}
        {...props}
      >
        {heading != null || copyable ? (
          <div className="flex min-h-9 items-center justify-between gap-2 border-b border-foreground/10 pl-3 pr-1 dark:border-border">
            <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{heading}</span>
            {copyable ? <CopyIconButton value={code} labels={l} testId="code-block-copy" /> : null}
          </div>
        ) : null}
        <div className={SCROLL_FOCUS_WRAPPER}>
        <div
          ref={fade.ref}
          tabIndex={0}
          role="region"
          aria-label={typeof heading === "string" ? heading : l.code}
          style={{ ...(maxHeight != null ? { maxHeight } : null), ...fade.style }}
          className={cn("overflow-auto", SCROLL_REGION)}
        >
          <div className="flex min-w-fit font-mono text-xs leading-5">
            {gutter ? (
              <div
                aria-hidden="true"
                data-testid="code-block-gutter"
                className="sticky left-0 shrink-0 select-none whitespace-pre border-r border-foreground/10 bg-background px-3 py-3 text-right text-muted-foreground dark:border-border"
              >
                {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
              </div>
            ) : null}
            <pre className={cn("m-0 min-w-0 flex-1 px-3 py-3", wrap ? "whitespace-pre-wrap [overflow-wrap:anywhere]" : "whitespace-pre")}>
              <code data-language={language}>{highlight ? highlight(code, language) : code}</code>
            </pre>
          </div>
        </div>
        </div>
      </div>
    );
  },
);
CodeBlock.displayName = "CodeBlock";
