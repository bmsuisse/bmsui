import { SignalSlashIcon } from "@heroicons/react/24/outline";
import { type ReactElement, useEffect, useRef } from "react";
import { type IntegratedI18n, getI18n, useLabels } from "../../i18n/locale";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { Banner } from "../banner/Banner";
import { toast } from "../toast/toastStore";

export interface OfflineIndicatorLabels {
  offline: string;
  backOnline: string;
}

export const offlineIndicatorLabelsFor = ({ t }: IntegratedI18n): OfflineIndicatorLabels => ({
  offline: t("pwa.offline.message"),
  backOnline: t("pwa.offline.backOnline"),
});

export const defaultOfflineIndicatorLabels: OfflineIndicatorLabels = offlineIndicatorLabelsFor(getI18n("en", false));

export interface OfflineIndicatorProps {
  /** Whether the app is online. Defaults to `useOnlineStatus()`; pass your own flag (e.g. "API reachable") for a stricter check. */
  online?: boolean;
  /** Show a "back online" toast when the connection returns. Needs a `<Toaster />`. @default true */
  backOnlineToast?: boolean;
  /** Pad the top by the device's safe-area inset (standalone PWA). @default false */
  safeArea?: boolean;
  labels?: Partial<OfflineIndicatorLabels>;
  animated?: boolean;
  className?: string;
  "data-testid"?: string;
}

/**
 * The "you are offline" bar of the app shell: an amber `Banner` that appears while there is no
 * connection and a "back online" toast when it returns, so no app has to wire `useOnlineStatus`
 * to a `Banner` itself. It cannot be dismissed: the state is real, not a notice.
 */
export function OfflineIndicator({
  online,
  backOnlineToast = true,
  safeArea,
  labels,
  animated,
  className,
  "data-testid": testId,
}: OfflineIndicatorProps): ReactElement {
  const l = useLabels(offlineIndicatorLabelsFor, labels);
  const browserOnline = useOnlineStatus();
  const isOnline = online ?? browserOnline;
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      if (backOnlineToast) toast.success(l.backOnline, { id: "pwa-online" });
    }
  }, [isOnline, backOnlineToast, l.backOnline]);

  return (
    <Banner
      open={!isOnline}
      tone="warning"
      icon={<SignalSlashIcon />}
      safeArea={safeArea}
      animated={animated}
      className={className}
      data-testid={testId}
    >
      {l.offline}
    </Banner>
  );
}
