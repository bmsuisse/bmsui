import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { AnchorHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export const linkVariants = cva(
  "inline-flex items-center gap-1 rounded-sm underline-offset-4 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-disabled:pointer-events-none aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        // Accent text, underline on hover. `--primary` is navy in dark mode, so dark uses `--ring`.
        default: "font-medium text-primary hover:underline dark:text-ring",
        // Quiet navigation (breadcrumb-like, "Back", table cells): muted until hovered.
        subtle: "text-muted-foreground hover:text-foreground hover:underline",
        // Link inside running text: takes the surrounding colour and size, always underlined.
        inline: "inline gap-0 font-medium text-inherit underline decoration-current/40 hover:decoration-current",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface LinkLabels {
  /** Read by screen readers after the text of an `external` link. */
  newTab: string;
}

export const defaultLinkLabels: LinkLabels = { newTab: "(opens in new tab)" };

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof linkVariants> {
  /** Render the child element (a router `Link`, `NextLink`…) instead of an `<a>`, keeping our styling and `external` behaviour. */
  asChild?: boolean;
  /** Opens in a new tab: `target="_blank"`, `rel="noopener noreferrer"`, a small arrow icon and a screen-reader hint. */
  external?: boolean;
  labels?: Partial<LinkLabels>;
}

/**
 * Text link. Underlines on hover, shows a focus ring, and keeps `rel` safe for new tabs.
 * `variant`: `default` accent, `subtle` muted, `inline` for links inside a sentence.
 * With `asChild` the child element carries the link (`<Link asChild><RouterLink to="/x">Orders</RouterLink></Link>`),
 * so client-side routing keeps working. For a link that looks like a button use `Button asChild`.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant, asChild = false, external = false, labels, children, target, rel, ...props }, ref) => {
    const l = { ...defaultLinkLabels, ...labels };
    const Comp = asChild ? Slot : "a";
    const relTokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
    if (external) {
      relTokens.add("noopener");
      relTokens.add("noreferrer");
    }
    return (
      <Comp
        ref={ref}
        className={cn(linkVariants({ variant }), className)}
        target={external ? (target ?? "_blank") : target}
        rel={relTokens.size ? [...relTokens].join(" ") : undefined}
        {...props}
      >
        {asChild ? <Slottable>{children}</Slottable> : children}
        {external ? (
          <>
            <ArrowTopRightOnSquareIcon aria-hidden="true" className={cn("inline-block h-[0.85em] w-[0.85em] shrink-0", variant === "inline" && "ml-1 align-[-0.1em]")} />
            <span className="sr-only">{l.newTab}</span>
          </>
        ) : null}
      </Comp>
    );
  },
);
Link.displayName = "Link";
