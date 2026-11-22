import {
  createContext,
  type CSSProperties,
  isValidElement,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useLayoutEffect,
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
// one rendering a <span> gets no Enter/Space activation (Radix had none either).
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

/** Escape events a submenu already closed on: Radix closes the parent menu then without asking its content. */
const escaped = new WeakSet<Event>();

/**
 * Root side of the content-level dismiss callbacks: returns the ref to provide and an
 * `onOpenChange` that cancels a close the content's callbacks prevented.
 */
export function useDismissBridge<D extends ChangeDetails>(setOpen: (open: boolean, details: D) => void) {
  const ref = useRef<RadixDismissProps>({});
  const onOpenChange = useCallback(
    (open: boolean, details: D) => {
      if (!open && prevented(ref.current, details)) return details.cancel();
      if (!open && details.reason === "escape-key" && details.event) escaped.add(details.event);
      setOpen(open, details);
    },
    [setOpen],
  );
  return { ref, onOpenChange };
}

function prevented(handlers: RadixDismissProps, { reason, event }: ChangeDetails) {
  if (!event) return false;
  if (reason === "escape-key") {
    // Bubbled from a submenu that closed on it (Base UI prevented it): close, like Radix, without the handler.
    if (escaped.has(event)) return false;
    handlers.onEscapeKeyDown?.(event as KeyboardEvent);
  } else if (reason === "outside-press") {
    handlers.onPointerDownOutside?.(event);
    handlers.onInteractOutside?.(event);
  } else if (reason === "focus-out") {
    const focused = (event as FocusEvent).relatedTarget;
    if (!focused) return false;
    // Radix's focus-outside event targets the element that took focus, not the one that lost it.
    const outside = new CustomEvent("dismissableLayer.focusOutside", { cancelable: true, detail: { originalEvent: event } });
    Object.defineProperty(outside, "target", { value: focused });
    handlers.onFocusOutside?.(outside);
    handlers.onInteractOutside?.(outside);
    return outside.defaultPrevented;
  } else return false;
  return event.defaultPrevented;
}

/** Content side: registers its Radix dismiss callbacks with the root. */
export function useDismissCallbacks(handlers: RadixDismissProps) {
  const ref = useContext(DismissContext);
  useLayoutEffect(() => {
    if (ref) ref.current = handlers;
  });
}

/**
 * Radix `onOpenAutoFocus` / `onCloseAutoFocus` as Base UI `initialFocus` / `finalFocus`. Like Radix, the
 * event is dispatched on the popup, so handlers can use `event.currentTarget`. Returns the popup's ref too.
 */
export function useAutoFocus<T extends HTMLElement>({ onOpenAutoFocus, onCloseAutoFocus }: RadixFocusProps, ref: Ref<T>) {
  const popup = useRef<T | null>(null);
  const mergedRef = useCallback(
    (element: T | null) => {
      popup.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );
  return {
    ref: mergedRef,
    ...(onOpenAutoFocus ? { initialFocus: () => !dispatchPrevented(popup.current, "focusScope.autoFocusOnMount", onOpenAutoFocus) } : {}),
    ...(onCloseAutoFocus ? { finalFocus: () => !dispatchPrevented(popup.current, "focusScope.autoFocusOnUnmount", onCloseAutoFocus) } : {}),
  };
}

function dispatchPrevented(target: EventTarget | null, name: string, handler: (event: Event) => void) {
  const event = new CustomEvent(name, { cancelable: true });
  if (!target) {
    handler(event);
    return event.defaultPrevented;
  }
  target.addEventListener(name, handler, { once: true });
  target.dispatchEvent(event);
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
      className: hideWhenDetached ? "z-50 data-[anchor-hidden]:invisible" : "z-50",
      side,
      align,
      sideOffset,
      alignOffset,
      collisionPadding,
      sticky: sticky === "always" ? true : undefined,
      ...(avoidCollisions === false ? { collisionAvoidance: { side: "none", align: "none" } as const } : {}),
    },
    rest,
  };
}

