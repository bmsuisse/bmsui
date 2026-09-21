import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { getConfirmButtonPlacement } from "../../lib/platform";

export interface DialogActionsProps {
  /** The affirmative/primary action — e.g. Save, Delete, OK. */
  primary: ReactNode;
  /** The dismissive/secondary action — e.g. Cancel. */
  secondary: ReactNode;
}

/**
 * Renders `primary`/`secondary` in the order the current platform's own
 * dialogs use — Windows puts the primary action on the left, every other
 * platform we target (iOS/iPadOS, macOS, Android, Linux) puts it on the
 * right — instead of a fixed order every caller has to get right itself.
 * `ConfirmDialog` uses this internally; use it directly for any other
 * dialog/panel footer with the same primary-vs-secondary action shape (e.g.
 * a custom `Modal` footer or `ResponsivePanel` footer).
 *
 * Renders no wrapping element of its own — nest it inside the caller's own
 * footer container (e.g. `DialogFooter`, or `Modal`'s `footer` prop) for
 * layout/spacing.
 */
export function DialogActions({ primary, secondary }: DialogActionsProps): ReactElement {
  // Platform doesn't change mid-session, so this is computed once rather
  // than re-read from `navigator` on every render.
  const [placement] = useState(getConfirmButtonPlacement);

  return placement === "leading" ? (
    <>
      {primary}
      {secondary}
    </>
  ) : (
    <>
      {secondary}
      {primary}
    </>
  );
}
