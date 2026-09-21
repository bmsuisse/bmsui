import type { Key, ReactElement, ReactNode } from "react";
import { Fragment, useState } from "react";
import { getConfirmButtonPlacement } from "../../lib/platform";

export interface DialogActionsProps {
  /**
   * The dialog's non-cancel actions, ordered from *furthest from Cancel* to
   * *nearest to Cancel* — e.g. `[secondaryAction, primaryAction]`. For a
   * plain two-button confirm dialog, pass a single primary action here.
   */
  actions: ReactNode[];
  /** The dismissive/cancel action. */
  cancel: ReactNode;
}

/**
 * Renders `actions` and `cancel` in the order the current platform's own
 * dialogs use — Windows puts Cancel on the right (trailing), every other
 * platform we target (iOS/iPadOS, macOS, Android, Linux) puts it on the
 * left (leading) — instead of a fixed order every caller has to get right
 * itself. `ConfirmDialog` and `QuestionDialog` use this internally; use it
 * directly for any other dialog/panel footer with the same
 * actions-plus-cancel shape.
 *
 * `actions` is reversed when Cancel sits on the left, so the action nearest
 * Cancel is always the *last* element of `actions` and the one furthest
 * from Cancel is always the *first*, regardless of platform — a caller
 * picks the order once, by meaning, and doesn't have to reason about which
 * edge Cancel lands on.
 *
 * Renders no wrapping element of its own — nest it inside the caller's own
 * footer container (e.g. `DialogFooter`, or `Modal`'s `footer` prop) for
 * layout/spacing.
 */
export function DialogActions({ actions, cancel }: DialogActionsProps): ReactElement {
  // Platform doesn't change mid-session, so this is computed once rather
  // than re-read from `navigator` on every render.
  const [placement] = useState(getConfirmButtonPlacement);
  const cancelLeading = placement === "trailing";
  const ordered = cancelLeading ? [...actions].reverse() : actions;

  const renderedActions = ordered.map((action, index) => (
    <Fragment key={actionKey(action, index)}>{action}</Fragment>
  ));

  return cancelLeading ? (
    <>
      {cancel}
      {renderedActions}
    </>
  ) : (
    <>
      {renderedActions}
      {cancel}
    </>
  );
}

function actionKey(action: ReactNode, index: number): Key {
  if (action && typeof action === "object" && "key" in action && action.key !== null) return action.key as Key;
  return index;
}
