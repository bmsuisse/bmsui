import { ArrowDownTrayIcon, ArrowUpOnSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import { type ReactElement, type ReactNode, useId, useState } from "react";
import { type IntegratedI18n, getI18n, useLabels } from "../../i18n/locale";
import { type InstallPlatform, useInstallPrompt } from "../../hooks/useInstallPrompt";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { Banner, BannerAction } from "../banner/Banner";
import { ResponsivePanel } from "../modal/ResponsivePanel";

export interface InstallPromptLabels {
  title: (appName: string) => string;
  description: string;
  install: string;
  notNow: string;
  iosTitle: string;
  iosShare: string;
  iosAdd: string;
  iosConfirm: string;
  close: string;
}

export const installPromptLabelsFor = ({ t }: IntegratedI18n): InstallPromptLabels => ({
  title: (appName) => t("pwa.install.title", { appName }),
  description: t("pwa.install.description"),
  install: t("pwa.install.action"),
  notNow: t("pwa.install.notNow"),
  iosTitle: t("pwa.install.iosTitle"),
  iosShare: t("pwa.install.iosShare"),
  iosAdd: t("pwa.install.iosAdd"),
  iosConfirm: t("pwa.install.iosConfirm"),
  close: t("pwa.install.close"),
});

export const defaultInstallPromptLabels: InstallPromptLabels = installPromptLabelsFor(getI18n("en", false));

export interface InstallPromptProps {
  /** Shown in the title ("Install OneSales"). */
  appName: string;
  /** App icon in the tile. Defaults to a download icon. */
  icon?: ReactNode;
  /** One line under the title. */
  description?: ReactNode;
  /**
   * Whether to show it. Leave it out to show whenever the app can be installed and "Not now" was not
   * chosen recently; pass your own rule (second visit, after a saved order) to decide yourself, in
   * which case a "Not now" is reported through `onDismiss` and you hide it.
   */
  open?: boolean;
  /** `card` (default) floats at the bottom; `banner` is a bar in the app shell. */
  variant?: "card" | "banner";
  /** `fixed` (default) pins the card to the bottom of the screen; `static` keeps it in the layout. Cards only. */
  position?: "fixed" | "static";
  /** Forces the platform, for tests and stories. */
  platform?: InstallPlatform;
  onInstalled?: () => void;
  onDismiss?: () => void;
  labels?: Partial<InstallPromptLabels>;
  animated?: boolean;
  className?: string;
  "data-testid"?: string;
}

function IosSteps({ labels }: { labels: InstallPromptLabels }): ReactElement {
  const chip = "flex size-8 shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 [&_svg]:size-5";
  const steps: Array<[ReactNode, string]> = [
    [<ArrowUpOnSquareIcon key="s" aria-hidden="true" />, labels.iosShare],
    [<span key="a" aria-hidden="true" className="flex size-5 items-center justify-center rounded-[4px] border-2 border-current"><PlusIcon className="!size-3 stroke-[3]" /></span>, labels.iosAdd],
    [<span key="c" aria-hidden="true" className="text-xs font-semibold">OK</span>, labels.iosConfirm],
  ];
  return (
    <ol className="flex flex-col gap-3">
      {steps.map(([icon, text], index) => (
        <li key={text} className="flex items-center gap-3 text-sm">
          <span className={chip}>{icon}</span>
          <span><span className="sr-only">{index + 1}. </span>{text}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * An "install this app" prompt. Where the browser can install natively (Chrome, Edge, Android) the
 * Install button opens its dialog; in Safari on iPhone/iPad, which has no such API, it opens a short
 * "Share, Add to Home Screen" guide instead. Elsewhere, or once installed, it renders nothing.
 * It never decides *when* to ask: see `open`. Call `captureInstallPrompt()` in your entry file.
 */
export function InstallPrompt({
  appName,
  icon,
  description,
  open,
  variant = "card",
  position = "fixed",
  platform: forcedPlatform,
  onInstalled,
  onDismiss,
  labels,
  animated = true,
  className,
  "data-testid": testId,
}: InstallPromptProps): ReactElement | null {
  const l = useLabels(installPromptLabelsFor, labels);
  const install = useInstallPrompt({ platform: forcedPlatform });
  const [guideOpen, setGuideOpen] = useState(false);
  const titleId = useId();

  const visible = install.platform !== "none" && (open ?? (install.canInstall && !install.dismissed));
  if (!visible && !guideOpen) return null;

  const handleInstall = async (): Promise<void> => {
    if (install.platform === "ios") {
      setGuideOpen(true);
      return;
    }
    if ((await install.promptInstall()) === "accepted") onInstalled?.();
  };
  const handleDismiss = (): void => {
    install.dismiss();
    onDismiss?.();
  };

  const guide = (
    <ResponsivePanel
      open={guideOpen}
      onOpenChange={setGuideOpen}
      title={l.iosTitle}
      size="sm"
      footer={<Button variant="outline" onClick={() => setGuideOpen(false)}>{l.close}</Button>}
    >
      <IosSteps labels={l} />
    </ResponsivePanel>
  );

  if (variant === "banner") {
    return (
      <>
        <Banner
          open={visible}
          tone="brand"
          icon={<ArrowDownTrayIcon />}
          animated={animated}
          className={className}
          data-testid={testId}
          onDismiss={handleDismiss}
          labels={{ dismiss: l.notNow }}
          actions={<BannerAction onClick={handleInstall}>{l.install}</BannerAction>}
        >
          {l.title(appName)}
        </Banner>
        {guide}
      </>
    );
  }

  return (
    <>
      {visible ? (
        <section
          role="region"
          aria-labelledby={titleId}
          data-testid={testId}
          className={cn(
            "flex items-start gap-3 rounded-xl border border-foreground/10 bg-popover p-4 text-popover-foreground shadow-lg dark:border-border",
            position === "fixed" &&
              "fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 md:inset-x-auto md:right-4 md:w-96",
            animated &&
              "transition-[opacity,translate] duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0",
            className,
          )}
        >
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-foreground/5 ring-1 ring-foreground/10 [&_img]:size-full [&_svg]:size-5"
          >
            {icon ?? <ArrowDownTrayIcon />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-sm font-semibold leading-snug">{l.title(appName)}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{description ?? l.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleInstall}>{l.install}</Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>{l.notNow}</Button>
            </div>
          </div>
        </section>
      ) : null}
      {guide}
    </>
  );
}
