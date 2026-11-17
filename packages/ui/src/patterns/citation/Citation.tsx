import type { ReactElement } from "react";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../primitives/tooltip";

export interface CitationSource {
  url: string;
  title: string;
  /** Shown under the title; derived from `url` (without `www.`) when omitted. */
  domain?: string;
}

export interface CitationLabels {
  /** Accessible name of the chip, e.g. "Source 2: Swiss Federal Statistics". */
  source: (index: number, title: string) => string;
  /** Heading of `SourceList`. */
  sources: string;
}

export const defaultCitationLabels: CitationLabels = {
  source: (index, title) => `Source ${index}: ${title}`,
  sources: "Sources",
};

/** `example.com` for `https://www.example.com/a`; the raw string when it is not a URL. */
export function getSourceDomain(source: Pick<CitationSource, "url" | "domain">): string {
  if (source.domain) return source.domain;
  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return source.url;
  }
}

/** Only web links become `<a href>`; anything else (javascript:, data:) stays inert text. */
function isSafeHref(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export interface CitationProps {
  /** The number shown, 1-based, as the model wrote it in the text. */
  index: number;
  /** The source behind the number; leave `undefined` when it was dropped or is out of range to get a bare `[n]`. */
  source?: CitationSource;
  labels?: Partial<CitationLabels>;
  className?: string;
}

const chip =
  "relative mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-pill,9999px)] bg-foreground/10 px-1 align-super text-[10px] font-medium leading-none text-foreground no-underline transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 motion-reduce:transition-none";

/**
 * A small numbered chip for a web source cited inside generated text ("…grew 4 % [2]"). Hover or
 * focus shows title and domain, click opens the source in a new tab. A source that is unknown
 * renders a bare, unlinked `[n]` so the sentence still reads. Put it inline in your markdown
 * renderer; list the sources below the message with `SourceList`.
 */
export const Citation = ({ index, source, labels, className }: CitationProps): ReactElement => {
  const l = { ...defaultCitationLabels, ...labels };
  if (!source) {
    return (
      <sup data-testid="citation-bare" className={cn("mx-0.5 text-[10px] text-muted-foreground", className)}>
        [{index}]
      </sup>
    );
  }
  const name = l.source(index, source.title);
  const content = isSafeHref(source.url) ? (
    <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={name} className={cn(chip, className)}>
      {index}
    </a>
  ) : (
    <span role="img" aria-label={name} tabIndex={0} className={cn(chip, className)}>
      {index}
    </span>
  );
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-64">
          <p className="break-words text-xs font-medium">{source.title}</p>
          <p className="break-all text-[11px] text-muted-foreground">{getSourceDomain(source)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export interface SourceListProps {
  sources: CitationSource[];
  /** Number of the first entry. @default 1 */
  start?: number;
  labels?: Partial<CitationLabels>;
  className?: string;
}

/** The numbered list of sources under a message, matching the `Citation` numbers. */
export const SourceList = ({ sources, start = 1, labels, className }: SourceListProps): ReactElement | null => {
  const l = { ...defaultCitationLabels, ...labels };
  if (sources.length === 0) return null;
  return (
    <section aria-label={l.sources} className={cn("min-w-0 text-xs", className)}>
      <h4 className="mb-1.5 font-semibold text-muted-foreground">{l.sources}</h4>
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {sources.map((source, i) => {
          const n = start + i;
          const body = (
            <>
              <span className="min-w-0 truncate font-medium">{source.title}</span>
              <span className="shrink-0 text-muted-foreground">{getSourceDomain(source)}</span>
            </>
          );
          return (
            <li key={`${source.url}-${n}`} className="flex min-w-0 items-baseline gap-2">
              <span className="w-5 shrink-0 text-right tabular-nums text-muted-foreground">{n}.</span>
              {isSafeHref(source.url) ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-6 min-w-0 flex-1 items-baseline gap-2 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {body}
                </a>
              ) : (
                <span className="flex min-w-0 flex-1 items-baseline gap-2">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
