import type { MouseEvent, ReactElement } from "react";
import { cn } from "../../lib/utils";

export interface SkipLink {
  label: string;
  /** Anchor to jump to (`"#main"`); the target should exist in the page. */
  href?: string;
  /** Called on activation, for apps that move focus themselves. Runs before the `href` navigation; `preventDefault()` cancels it. */
  onSelect?: (event: MouseEvent<HTMLElement>) => void;
}

export interface SkipLinksLabels {
  /** Accessible name of the `<nav>`. */
  nav: string;
}
export const defaultSkipLinksLabels: SkipLinksLabels = { nav: "Skip links" };

export interface SkipLinksProps {
  links: SkipLink[];
  /** Accessible name of the `<nav>`; overrides `labels.nav`. @default "Skip links" */
  label?: string;
  labels?: Partial<SkipLinksLabels>;
  className?: string;
  "data-testid"?: string;
}

const LINK =
  "sr-only rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-lg outline-none focus-visible:not-sr-only focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * The first Tab stops of a page: jump straight to the main content, search or
 * navigation instead of tabbing through the header. Invisible until one of
 * them has keyboard focus, then a pill in the top-left corner. Mount it as the
 * first element of the app root.
 */
export const SkipLinks = ({ links, label, labels, className, ...props }: SkipLinksProps): ReactElement => (
  <nav
    aria-label={label ?? { ...defaultSkipLinksLabels, ...labels }.nav}
    className={cn(
      "pointer-events-none fixed left-2 top-2 z-[60] flex max-w-[calc(100vw-1rem)] flex-wrap gap-2 has-[:focus-visible]:pointer-events-auto",
      className,
    )}
    {...props}
  >
    {links.map((link) =>
      link.href ? (
        <a key={link.label} href={link.href} onClick={link.onSelect} className={LINK}>
          {link.label}
        </a>
      ) : (
        <button key={link.label} type="button" onClick={link.onSelect} className={LINK}>
          {link.label}
        </button>
      ),
    )}
  </nav>
);
