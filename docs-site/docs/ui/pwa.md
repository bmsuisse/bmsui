---
title: PWA components
---

# PWA components

Prompts for an installable app with a service worker: "new version, reload", "install this
app" and "you are offline". They need no dependency on vite-plugin-pwa or workbox: you pass
the service-worker state in, and the components own the UI, the texts (six languages, see
[Translations](./translations)) and the accessibility.

Rule of thumb used throughout: **state that stays true goes in a `Banner`** (update waiting,
offline), **a one-off confirmation goes in a `toast`** ("ready to work offline", "back online").
A toast is wrong for an update: only three fit at once and it disappears after a few seconds.

## Update prompt

```tsx
import { useRegisterSW } from "virtual:pwa-register/react";
import { UpdatePrompt } from "@bmsuisse/ui";

function Shell() {
  const { needRefresh: [needRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } =
    useRegisterSW();
  return (
    <>
      <UpdatePrompt
        needRefresh={needRefresh}
        offlineReady={offlineReady}
        onOfflineReadyShown={() => setOfflineReady(false)}
        onUpdate={() => updateServiceWorker(true)}
        canReload={() => !formIsDirty()}   // optional: ask to save first
      />
      {/* header, routes, <Toaster /> ... */}
    </>
  );
}
```

Set `registerType: "prompt"` in the plugin; with `autoUpdate` the page reloads by itself and
there is nothing to ask. Reloading throws away unsaved form state and reloads every other open
tab, which is what `canReload` is for: while it returns `false` the bar says "save first" instead.
"Later" hides the bar for `snoozeMs` (4 hours). `useServiceWorkerUpdate` is the headless hook
behind it, for a bar of your own.

## Install prompt

```ts
// main.tsx, before createRoot(...).render(...)
import { captureInstallPrompt } from "@bmsuisse/ui";
captureInstallPrompt();
```

```tsx
<InstallPrompt appName="OneSales" icon={<img src="/icon-192.png" alt="" />} />
```

Browsers fire `beforeinstallprompt` once, often before React mounts; `captureInstallPrompt()`
keeps it. In Chrome, Edge and on Android the Install button opens the native dialog. Safari on
iPhone/iPad has no such API, so the button opens a "Share, Add to Home Screen" guide; other iOS
browsers and desktop Safari show nothing. Once installed, or after "Not now" (30 days), it hides.

It does not decide *when* to ask. Pass your own rule as `open`, for example after a second visit
or after the first saved order, and hide it from `onDismiss`.

## Offline indicator

```tsx
<OfflineIndicator />                 // follows the browser's online/offline events
<OfflineIndicator online={apiUp} />  // or your own reachability flag
```

An amber banner while offline, a "back online" toast afterwards (`backOnlineToast={false}` turns
it off). Standalone apps with `viewport-fit=cover` should pass `safeArea` to the banners so
they clear the notch; `useStandaloneMode()` tells you whether the app runs installed.

## Not included

A notification-permission prompt (the wording is yours: use `Modal` or `ConfirmPopover`),
storage persistence (`navigator.storage.persist()` needs no UI) and a "what's new" hint
(`useLocalStorageState` for the last seen version plus a `toast` with an action).
