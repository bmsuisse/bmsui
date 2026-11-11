---
title: Hooks
---

# Hooks

Behaviour hooks exported from `@bmsuisse/ui`. They have no styling and no
dependencies beyond React 18/19, and are safe to import in SSR code (they
touch `window`/`document` only in effects or event handlers).

## `useHotkeys` and `formatHotkey`

```tsx
import { formatHotkey, useHotkeys } from "@bmsuisse/ui";

useHotkeys([
  { keys: "mod+k", handler: () => setPaletteOpen(true) },
  { keys: "shift+?", handler: () => setSheetOpen(true) },
  { keys: "g i", handler: () => navigate("/inbox") }, // chord: g, then i
  { keys: "escape", handler: close, allowInInputs: true },
]);

<DropdownMenuShortcut>{formatHotkey("mod+k")}</DropdownMenuShortcut> // ⌘K on a Mac, Ctrl+K elsewhere
```

- `keys`: `+`-joined modifiers (`mod`, `ctrl`, `meta`, `alt`, `shift`) and
  one key; space-separated combos form a chord. `mod` is ⌘ on Apple platforms
  and Ctrl elsewhere. Named keys: `escape`, `enter`, `space`, `tab`,
  `backspace`, `delete`, `up`/`down`/`left`/`right`, `plus`.
- Modifiers must match exactly (`k` does not fire on `mod+k`). Letters don't
  fire with Shift held unless `shift` is written; punctuation (`?`, `/`)
  ignores Shift, since that depends on the keyboard layout.
- Keys typed into inputs, textareas, selects and contenteditable are ignored
  unless `allowInInputs`. IME composition and events already
  `defaultPrevented` are ignored.
- Per hotkey: `enabled` (default `true`), `allowInInputs`, `preventDefault`
  (default `true`). Hook options set the defaults plus `enabled` for all and
  `chordTimeoutMs` (default 1000).
- The first matching hotkey wins. Handlers are read from a ref, so inline
  arrays don't re-subscribe.
- Single-character shortcuts (`n`, `/`) are easy to hit by accident (WCAG
  2.1.4): give users a way to turn them off with `enabled`.
- `formatHotkey(keys, platform?)`: `"mod+shift+p"` → `⇧⌘P` / `Ctrl+Shift+P`.
  Pass `"mac"` or `"other"` to force a platform (SSR, docs).

## `useClipboard`

```tsx
const { copy, copied, error, reset } = useClipboard({ timeout: 2000 });
<Button onClick={() => void copy(link)}>{copied ? "Copied" : "Copy link"}</Button>
```

`copy` resolves `true`/`false` and never rejects. A second copy restarts the
reset timer. Without `navigator.clipboard` (plain-http intranet pages, old
browsers) it falls back to a hidden textarea and `execCommand("copy")`.

## `useAnnounce`, `announce`, `<Announcer />`

```tsx
const announce = useAnnounce();
useEffect(() => announce(`${rows.length} results`), [rows.length]);
announce("Could not save", { politeness: "assertive" });
```

Messages go to a shared, visually hidden live region that is created on
`document.body` the first time it's needed (nothing happens during SSR).
Repeating the same text is announced again. `announce` also works outside
React.

Radix modal dialogs mark everything outside the dialog `aria-hidden`, which
silences the body-level region. Mount `<Announcer />` inside the dialog
content: while it is mounted, announcements go through it.

## `useMergedRefs`

```tsx
const Field = forwardRef<HTMLInputElement, Props>((props, forwarded) => {
  const local = useRef<HTMLInputElement>(null);
  return <input ref={useMergedRefs(local, forwarded)} {...props} />;
});
```

Returns a stable callback ref; it changes only when one of the input refs
does. React 19 callback refs that return a cleanup get the cleanup on detach.

## `useFocusTrap`

```tsx
const trapRef = useFocusTrap<HTMLDivElement>({ enabled: open });
return open ? <div ref={trapRef} role="dialog" aria-modal>…</div> : null;
```

Tab and Shift+Tab wrap inside the element; focus that escapes is pulled back.
On activation focus moves to `initialFocus` (`"first"` tabbable by default,
`"container"`, a ref, or `false`); on deactivation or unmount it goes back to
the element that had it before (`restoreFocus`, default `true`). Escape is up
to you. Radix `Dialog`/`Sheet` already trap focus; this is for custom
overlays and inline editors.

## `useLongPress`

```tsx
const longPress = useLongPress(() => openRowMenu(row), { threshold: 600 });
<tr {...longPress} onClick={() => openRow(row)}>…</tr>
```

Pointer events (mouse primary button, touch, pen). Fires after `threshold` ms
(default 500). Moving more than `moveTolerance` px (default 10), releasing,
leaving or a cancelled pointer stops it. The click after a long press is
swallowed, and so is the native context menu during the press. Also takes
`disabled`, `onStart` and `onCancel`.

## `useScrollOverflow`

```tsx
const { ref, top, bottom } = useScrollOverflow<HTMLDivElement>();
<div className="relative">
  {top && <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-background" />}
  <div ref={ref} className="max-h-80 overflow-y-auto">…</div>
  {bottom && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-background" />}
</div>
```

`top`, `bottom`, `left` and `right` say whether content is hidden beyond each
edge (physical sides, also correct in RTL). They update on scroll, on
container and child resizes (`ResizeObserver`), and when children are added
or removed. The component re-renders only when a flag flips.

## `useLocalStorageState`

```tsx
const [density, setDensity, resetDensity] = useLocalStorageState<"compact" | "comfortable">(
  "grid.density",
  "comfortable",
);
```

Works like `useState` but stores the value as JSON (or uses your own
`serialize`/`deserialize`) under `key`.

- Server render and hydration use the default; the stored value is read
  right after, so there is no hydration mismatch.
- It never throws. If storage is blocked or full, the value is kept in
  memory for the page; if the stored data can't be parsed, you get the default.
- Every hook with the same key updates together, also across tabs (turn that
  off with `syncTabs: false`). `remove()` deletes the key.
