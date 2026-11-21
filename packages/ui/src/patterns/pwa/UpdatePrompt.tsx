import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { type ReactElement, useEffect } from "react";
import { type IntegratedI18n, getI18n, useLabels } from "../../i18n/locale";
import { useServiceWorkerUpdate } from "../../hooks/useServiceWorkerUpdate";
import { Banner, BannerAction, type BannerTone } from "../banner/Banner";
import { toast } from "../toast/toastStore";

export interface UpdatePromptLabels {
  message: string;
  update: string;
  updating: string;
  later: string;
  blockedHint: string;
  offlineReady: string;
}

export const updatePromptLabelsFor = ({ t }: IntegratedI18n): UpdatePromptLabels => ({
  message: t("pwa.update.message"),
  update: t("pwa.update.action"),
  updating: t("pwa.update.updating"),
  later: t("pwa.update.later"),
  blockedHint: t("pwa.update.blocked"),
  offlineReady: t("pwa.update.offlineReady"),
});

export const defaultUpdatePromptLabels: UpdatePromptLabels = updatePromptLabelsFor(getI18n("en", false));

export interface UpdatePromptProps {
  /** A new service worker is waiting (vite-plugin-pwa's `needRefresh`). */
  needRefresh: boolean;
  /** Activates it and reloads, e.g. `() => updateServiceWorker(true)`. */
  onUpdate: () => void | Promise<void>;
  /** First-time caching finished (vite-plugin-pwa's `offlineReady`): shows one "ready to work offline" toast. Needs a `<Toaster />`. */
  offlineReady?: boolean;
  /** Called after that toast was shown, e.g. to reset the plugin's `offlineReady` state. */
  onOfflineReadyShown?: () => void;
  /** Return `false` while there is unsaved work; the update then waits and the bar asks to save first. */
  canReload?: () => boolean;
  /** How long "Later" hides the bar, in ms. @default 14_400_000 (4 hours) */
  snoozeMs?: number;
  /** Show the "Later" button. Turn it off for a version that must not run any longer. @default true */
  dismissible?: boolean;
  /** @default "brand" */
  tone?: BannerTone;
  /** Pad the top by the device's safe-area inset (standalone PWA). @default false */
  safeArea?: boolean;
  labels?: Partial<UpdatePromptLabels>;
  animated?: boolean;
  className?: string;
  "data-testid"?: string;
}

/**
 * The "new version available, reload" bar of a PWA, as a full-width `Banner` at the top of the
 * app shell. It never covers content, survives navigation (a toast would be dropped after a few
 * seconds or by newer toasts) and can wait until unsaved work is saved (`canReload`). Use it with
 * vite-plugin-pwa's `registerType: "prompt"`; the package itself has no dependency on the plugin.
 */
export function UpdatePrompt({
  needRefresh,
  onUpdate,
  offlineReady = false,
  onOfflineReadyShown,
  canReload,
  snoozeMs,
  dismissible = true,
  tone = "brand",
  safeArea,
  labels,
  animated,
  className,
  "data-testid": testId,
}: UpdatePromptProps): ReactElement {
  const l = useLabels(updatePromptLabelsFor, labels);
  const sw = useServiceWorkerUpdate({ needRefresh, offlineReady, onUpdate, canReload, snoozeMs });
  const { acknowledgeOfflineReady } = sw;

  useEffect(() => {
    if (!sw.offlineReady) return;
    toast.success(l.offlineReady, { id: "pwa-offline-ready" });
    acknowledgeOfflineReady();
    onOfflineReadyShown?.();
  }, [sw.offlineReady, l.offlineReady, acknowledgeOfflineReady, onOfflineReadyShown]);

  const updating = sw.status === "updating";
  return (
    <Banner
      open={sw.status !== "idle"}
      tone={tone}
      icon={<ArrowPathIcon />}
      safeArea={safeArea}
      animated={animated}
      className={className}
      data-testid={testId}
      actions={
        <>
          <BannerAction onClick={sw.update} disabled={updating} aria-busy={updating || undefined}>
            {updating ? (
              <>
                <ArrowPathIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                {l.updating}
              </>
            ) : (
              <>
                <ArrowPathIcon aria-hidden="true" />
                {l.update}
              </>
            )}
          </BannerAction>
          {dismissible && !updating ? <BannerAction onClick={sw.snooze} className="ring-0">{l.later}</BannerAction> : null}
        </>
      }
    >
      {sw.status === "blocked" ? l.blockedHint : l.message}
    </Banner>
  );
}
