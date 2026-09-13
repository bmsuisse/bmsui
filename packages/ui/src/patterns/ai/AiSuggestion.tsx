import { Check, Pencil, RotateCcw, X } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { Skeleton } from "../../primitives/skeleton";
import { AiMarker } from "./AiMarker";
import { ConfidenceIndicator, resolveConfidenceBand } from "./ConfidenceIndicator";

export type AiSuggestionStatus = "loading" | "pending" | "accepted" | "edited" | "rejected";

export interface AiSuggestionProps {
  /**
   * Controlled — the consumer owns it. See the class doc for why there is no
   * uncontrolled convenience mode.
   */
  status: AiSuggestionStatus;
  onAccept?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
  onRestore?: () => void;
  /** 0..1, forwarded to `ConfidenceIndicator` in the header and to the accessible name. */
  confidence?: number;
  /** e.g. "Suggested from PDF", "Extracted from note". */
  label?: string;
  /** e.g. "gpt-x · 2 min ago". */
  meta?: ReactNode;
  /**
   * `block` is the full card (header, content, footer). `inline` is a single
   * dense row for a field list where a card per field would be unusable.
   * @default "block"
   */
  layout?: "block" | "inline";
  /** The value/control being proposed. */
  children: ReactNode;
  labels?: { accept?: string; edit?: string; reject?: string; restore?: string; dismissed?: string };
  className?: string;
  testId?: string;
}

const DEFAULT_LABELS: Required<NonNullable<AiSuggestionProps["labels"]>> = {
  accept: "Accept",
  edit: "Edit",
  reject: "Reject",
  restore: "Restore",
  dismissed: "Suggestion dismissed",
};

// The accessible name ("AI suggestion, high confidence") has to agree with the
// bars sitting right next to it in the same header, so the band comes from
// ConfidenceIndicator's own exported helper rather than a second copy of the
// thresholds living here.
/** "AI suggestion[, high confidence | loading | accepted | edited | dismissed]". */
function groupLabel(status: AiSuggestionStatus, confidence: number | null | undefined): string {
  const base = "AI suggestion";
  if (status === "pending") {
    return confidence != null ? `${base}, ${resolveConfidenceBand(confidence)} confidence` : base;
  }
  const STATUS_WORD: Record<Exclude<AiSuggestionStatus, "pending">, string> = {
    loading: "loading",
    accepted: "accepted",
    edited: "edited",
    rejected: "dismissed",
  };
  return `${base}, ${STATUS_WORD[status]}`;
}

/**
 * The wrapper around AI-generated content that offers accept / edit / reject
 * — built for two real consumers: an offer parser's per-field match
 * overrides, and a visit report's extracted fields. Both need the same
 * shape (here is a proposal, here is how sure the model is, here is what a
 * human does about it) but differ in density: a parser field list wants
 * `layout="inline"`, a report review screen wants `layout="block"`.
 *
 * **`status` is controlled-only, deliberately.** The visit report's
 * dirty-field guard (don't silently discard an in-progress edit if the
 * underlying suggestion changes) needs to own the accept → edited transition
 * itself, including the option to *not* transition on a click until an async
 * save confirms. An uncontrolled convenience mode (internal state, fires
 * `onAccept` and flips its own visual state) is deliberately NOT provided —
 * it would either fight that guard or silently diverge from it. It gets
 * added only when a second consumer asks for it and needs to be reconciled
 * against the first, not preemptively.
 *
 * **Craft-floor note on the 2px left rail:** a colored `border-left` above
 * 1px on a card is the house style's default violation — it usually means
 * "I wanted an accent and reached for the cheapest one." This rail is the
 * one earned exception: the brief calls for it explicitly as the
 * AI-provenance marker, so it is built as a dedicated rail element (not a
 * bare `border-l` utility) inset flush with the card's own corner radius,
 * sized to the same `--ai` hue the rest of this folder uses — a deliberate
 * structural signal ("this whole block is a live proposal"), not a stray
 * decorative accent. It disappears the moment the proposal stops being a
 * proposal (`accepted`/`edited`/`rejected`), which is the tell that it was
 * never decoration in the first place.
 *
 * **Provenance survives the decision.** `accepted` and `edited` strip the
 * rail and tint — this is now just content — but keep a ~60%-opacity
 * `AiMarker` permanently. That is honesty over tidiness: a reader six months
 * from now must still be able to tell a model produced this value, even
 * after a human signed off on it. Only `rejected` drops the marker entirely,
 * because a dismissed suggestion isn't provenance for anything anymore.
 *
 * **Accessibility.** The wrapper is `role="group"` with an accessible name
 * like `"AI suggestion, high confidence"` — the confidence word comes from
 * `ConfidenceIndicator`'s exported `resolveConfidenceBand`, so the word and
 * the bars rendered beside it can never disagree.
 * Action buttons stay in normal DOM/tab order — there are deliberately no
 * global keyboard shortcuts (e.g. a bare `a`/`e`/`r`) for accept/edit/reject;
 * a shortcut that fires while the user is typing inside `children` (an
 * inline edit control) is a data-loss bug waiting to happen, and a proposal
 * queue that wants fast triage composes its own scoped shortcut layer around
 * this component instead. Icon-only buttons (the collapsed `Reject` on
 * phone, and every inline-layout action) always carry an `aria-label`.
 *
 * **Non-goals.** A bulk "Accept all high-confidence" control belongs to the
 * consumer, composed from the existing `ButtonGroup` over a list of these —
 * it needs list-level selection state this component doesn't have. There is
 * no "why did the model say this" explanation panel either: `meta` covers
 * model/time attribution, and anything deeper (a reasoning trace, a source
 * excerpt) is app content the consumer renders inside `children` or its own
 * disclosure, not a feature this shared wrapper grows.
 *
 * **Missing callbacks hide their button rather than disabling it.** A
 * disabled Accept button invites "why can't I click this?"; the consumer
 * that doesn't wire `onEdit` for a given field genuinely doesn't offer
 * editing there, so the button simply isn't in the DOM.
 */
export const AiSuggestion = ({
  status,
  onAccept,
  onEdit,
  onReject,
  onRestore,
  confidence,
  label,
  meta,
  layout = "block",
  children,
  labels,
  className,
  testId,
}: AiSuggestionProps): ReactElement => {
  const l = { ...DEFAULT_LABELS, ...labels };
  const name = groupLabel(status, confidence ?? null);
  const groupProps = {
    role: "group" as const,
    "aria-label": name,
    "data-status": status,
    "data-testid": testId,
  };

  if (layout === "inline") {
    return (
      <InlineSuggestion
        status={status}
        onAccept={onAccept}
        onEdit={onEdit}
        onReject={onReject}
        onRestore={onRestore}
        confidence={confidence}
        label={label}
        meta={meta}
        labels={l}
        className={className}
        groupProps={groupProps}
      >
        {children}
      </InlineSuggestion>
    );
  }

  return (
    <BlockSuggestion
      status={status}
      onAccept={onAccept}
      onEdit={onEdit}
      onReject={onReject}
      onRestore={onRestore}
      confidence={confidence}
      label={label}
      meta={meta}
      labels={l}
      className={className}
      groupProps={groupProps}
    >
      {children}
    </BlockSuggestion>
  );
};

interface SharedProps {
  status: AiSuggestionStatus;
  onAccept?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
  onRestore?: () => void;
  confidence?: number;
  label?: string;
  meta?: ReactNode;
  labels: Required<NonNullable<AiSuggestionProps["labels"]>>;
  className?: string;
  children: ReactNode;
  groupProps: { role: "group"; "aria-label": string; "data-status": string; "data-testid"?: string };
}

/** The rail: a dedicated element (not a `border-l` utility) so it reads as a
 * built structural marker rather than a stray accent — see the class doc's
 * craft-floor note. Only ever mounted for `pending`. */
function Rail(): ReactElement {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-y-0 left-0 w-0.5 rounded-l-lg bg-[var(--ai,#6366f1)]"
    />
  );
}

function BlockSuggestion({
  status,
  onAccept,
  onEdit,
  onReject,
  onRestore,
  confidence,
  label,
  meta,
  labels,
  className,
  children,
  groupProps,
}: SharedProps): ReactElement {
  if (status === "rejected") {
    return (
      <div
        {...groupProps}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground",
          className,
        )}
      >
        <span>{labels.dismissed}</span>
        {onRestore && (
          <Button type="button" variant="ghost" size="sm" className="h-10 gap-1.5 sm:h-8" onClick={onRestore}>
            <RotateCcw aria-hidden="true" className="size-3.5" />
            {labels.restore}
          </Button>
        )}
      </div>
    );
  }

  if (status === "accepted" || status === "edited") {
    return (
      <div {...groupProps} className={cn("flex flex-col gap-1.5", className)}>
        <div className="opacity-60">
          <AiMarker size="xs" label={status === "edited" ? "AI · edited" : "AI"} />
        </div>
        <div>{children}</div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div
        {...groupProps}
        className={cn("rounded-lg bg-[var(--ai,#6366f1)]/5 px-4 py-3", className)}
      >
        <div className="flex items-center gap-2">
          <AiMarker pulse size="xs" />
          {label && <span className="truncate text-xs text-muted-foreground">{label}</span>}
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  // pending
  return (
    <div
      {...groupProps}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-[var(--ai,#6366f1)]/5 pl-4",
        className,
      )}
    >
      <Rail />
      <div className="flex items-center justify-between gap-2 py-3">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <AiMarker size="xs" variant="inline" />
          {label && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{label}</span>
            </>
          )}
        </div>
        {confidence != null && <ConfidenceIndicator value={confidence} size="sm" className="shrink-0 pr-4" />}
      </div>
      <div className="pb-3 pr-4">{children}</div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 py-2.5 pr-4">
        {meta != null ? <div className="text-xs text-muted-foreground">{meta}</div> : <span />}
        <div className="ml-auto flex items-center gap-2">
          {onAccept && (
            <Button type="button" size="default" className="h-10 gap-1.5 sm:h-9" onClick={onAccept}>
              <Check aria-hidden="true" className="size-4" />
              {labels.accept}
            </Button>
          )}
          {onEdit && (
            <Button type="button" variant="outline" size="default" className="h-10 gap-1.5 sm:h-9" onClick={onEdit}>
              <Pencil aria-hidden="true" className="size-4" />
              {labels.edit}
            </Button>
          )}
          {onReject && (
            <Button
              type="button"
              variant="ghost"
              aria-label={labels.reject}
              className="h-10 w-10 shrink-0 gap-1.5 px-0 sm:h-9 sm:w-auto sm:px-3"
              onClick={onReject}
            >
              <X aria-hidden="true" className="size-4" />
              <span aria-hidden="true" className="hidden sm:inline">
                {labels.reject}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function InlineSuggestion({
  status,
  onAccept,
  onEdit,
  onReject,
  onRestore,
  confidence,
  label,
  meta,
  labels,
  className,
  children,
  groupProps,
}: SharedProps): ReactElement {
  if (status === "rejected") {
    return (
      <div
        {...groupProps}
        className={cn(
          "flex items-center justify-between gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{labels.dismissed}</span>
        {onRestore && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={labels.restore}
            className="size-10 shrink-0 sm:size-8"
            onClick={onRestore}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>
    );
  }

  if (status === "accepted" || status === "edited") {
    return (
      <div {...groupProps} className={cn("flex items-center gap-2", className)}>
        <span className="opacity-60">
          <AiMarker size="xs" variant="inline" label={status === "edited" ? "AI · edited" : "AI"} />
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div
        {...groupProps}
        className={cn(
          "flex items-center gap-2 rounded-md bg-[var(--ai,#6366f1)]/5 px-3 py-2",
          className,
        )}
      >
        <AiMarker pulse size="xs" variant="inline" />
        <Skeleton className="h-3 flex-1" />
      </div>
    );
  }

  // pending
  return (
    <div
      {...groupProps}
      className={cn(
        "relative flex items-center gap-2 overflow-hidden rounded-md border border-border bg-[var(--ai,#6366f1)]/5 py-2 pl-4 pr-2",
        className,
      )}
    >
      <Rail />
      <AiMarker size="xs" variant="inline" />
      {label && <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{label}</span>}
      <div className="min-w-0 flex-1">{children}</div>
      {confidence != null && <ConfidenceIndicator value={confidence} size="sm" format="meter" className="shrink-0" />}
      {meta != null && <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">{meta}</span>}
      <div className="flex shrink-0 items-center gap-1">
        {onAccept && (
          <Button
            type="button"
            size="icon"
            aria-label={labels.accept}
            className="size-10 sm:size-8"
            onClick={onAccept}
          >
            <Check aria-hidden="true" className="size-4" />
          </Button>
        )}
        {onEdit && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={labels.edit}
            className="size-10 sm:size-8"
            onClick={onEdit}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
        )}
        {onReject && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={labels.reject}
            className="size-10 sm:size-8"
            onClick={onReject}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
