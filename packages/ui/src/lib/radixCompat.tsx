import {
  createContext,
  type CSSProperties,
  isValidElement,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// The primitives moved from Radix to Base UI (ui 0.31.0) but kept Radix's public API, so apps
// did not have to change: `asChild`, `data-state`, the `--radix-*` CSS variables, focus and
// dismiss callbacks on the content part. This file maps them onto Base UI.

/** Radix `asChild`: the child element becomes the part's element (Base UI's `render`). */
export function slot(asChild: boolean | undefined, children: ReactNode, { button = false } = {}) {
  if (!asChild || !isValidElement(children)) return { children };
  return button ? { render: children, nativeButton: rendersButton(children) } : { render: children };
}

// ponytail: a component child (our Button, an app's own) is assumed to render a <button>;
// one rendering a <span> still works but lacks Base UI's keyboard handling. Pass nativeButton={false}.
const rendersButton = (child: ReactElement) => typeof child.type !== "string" || child.type === "button";

/** Value + setter that work controlled (`value` given) and uncontrolled (`defaultValue`). */
export function useControllable<T, Rest extends unknown[] = []>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T, ...rest: Rest) => void,
) {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const set = useCallback(
    (next: T, ...rest: Rest) => {
      if (!controlled) setInner(next);
      onChange?.(next, ...rest);
    },
    [controlled, onChange],
  );
  return [controlled ? value : inner, set] as const;
}

export const openState = (open: boolean) => (open ? "open" : "closed");
export const checkedState = (checked: boolean | "indeterminate") =>
  checked === "indeterminate" ? "indeterminate" : checked ? "checked" : "unchecked";

/** Radix's content-level callbacks; `event.preventDefault()` keeps the popup open / focus where it is. */
export interface RadixDismissProps {
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: Event) => void;
  onFocusOutside?: (event: Event) => void;
  onInteractOutside?: (event: Event) => void;
}
export interface RadixFocusProps {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

type DismissRef = MutableRefObject<RadixDismissProps>;
const DismissContext = createContext<DismissRef | null>(null);
export const DismissProvider = DismissContext.Provider;

interface ChangeDetails {
  reason: string;
  event: Event;
  cancel: () => void;
}

/**
 * Root side of the content-level dismiss callbacks: returns the ref to provide and an
 * `onOpenChange` that cancels a close the content's callbacks prevented.
 */
export function useDismissBridge<D extends ChangeDetails>(setOpen: (open: boolean, details: D) => void) {
  const ref = useRef<RadixDismissProps>({});
  const onOpenChange = useCallback(
    (open: boolean, details: D) => {
      if (!open && prevented(ref.current, details)) return details.cancel();
      setOpen(open, details);
    },
    [setOpen],
  );
  return { ref, onOpenChange };
}

function prevented(handlers: RadixDismissProps, { reason, event }: ChangeDetails) {
  if (!event) return false;
  if (reason === "escape-key") handlers.onEscapeKeyDown?.(event as KeyboardEvent);
  else if (reason === "outside-press") {
    handlers.onPointerDownOutside?.(event);
    handlers.onInteractOutside?.(event);
  } else if (reason === "focus-out") {
    handlers.onFocusOutside?.(event);
    handlers.onInteractOutside?.(event);
  } else return false;
  return event.defaultPrevented;
}

/** Content side: registers its Radix dismiss callbacks with the root. */
export function useDismissCallbacks(handlers: RadixDismissProps) {
  const ref = useContext(DismissContext);
  if (ref) ref.current = handlers;
}

/** Radix `onOpenAutoFocus` / `onCloseAutoFocus` as Base UI `initialFocus` / `finalFocus`. */
export function focusProps({ onOpenAutoFocus, onCloseAutoFocus }: RadixFocusProps) {
  return {
    ...(onOpenAutoFocus ? { initialFocus: () => !callPrevented(onOpenAutoFocus) } : {}),
    ...(onCloseAutoFocus ? { finalFocus: () => !callPrevented(onCloseAutoFocus) } : {}),
  };
}

function callPrevented(handler: (event: Event) => void) {
  const event = new Event("focus", { cancelable: true });
  handler(event);
  return event.defaultPrevented;
}

/** Radix's popper CSS variables, pointing at Base UI's, for styles written against Radix. */
export function radixVars(name: string): CSSProperties {
  const p = `--radix-${name}`;
  return {
    [`${p}-trigger-width`]: "var(--anchor-width)",
    [`${p}-trigger-height`]: "var(--anchor-height)",
    [`${p}-content-transform-origin`]: "var(--transform-origin)",
    [`${p}-content-available-width`]: "var(--available-width)",
    [`${p}-content-available-height`]: "var(--available-height)",
  } as CSSProperties;
}

/** Radix positioning props of a content part, split off for Base UI's Positioner. */
export interface RadixPositionProps {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number | Partial<Record<"top" | "right" | "bottom" | "left", number>>;
  avoidCollisions?: boolean;
  sticky?: "partial" | "always";
  hideWhenDetached?: boolean;
}

export function splitPosition<P extends RadixPositionProps>(props: P) {
  const { side, align, sideOffset, alignOffset, collisionPadding, avoidCollisions, sticky, hideWhenDetached, ...rest } =
    props;
  return {
    position: {
      side,
      align,
      sideOffset,
      alignOffset,
      collisionPadding,
      sticky: sticky === "always" ? true : undefined,
      ...(avoidCollisions === false ? { collisionAvoidance: { side: "none", align: "none" } as const } : {}),
    },
    hideWhenDetached,
    rest,
  };
}

