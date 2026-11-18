import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { type ElementType, type ReactNode, forwardRef } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../primitives/dropdown-menu";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";

export interface SplitButtonItem {
  id: string;
  label: ReactNode;
  onSelect: () => void;
  icon?: ElementType;
  disabled?: boolean;
  danger?: boolean;
}

export interface SplitButtonLabels {
  /** Accessible name of the chevron button. */
  menu: string;
}
export const defaultSplitButtonLabels: SplitButtonLabels = { menu: "More actions" };

export interface SplitButtonProps {
  /** Label of the primary action. */
  children: ReactNode;
  onClick?: () => void;
  items: SplitButtonItem[];
  variant?: "default" | "outline" | "secondary";
  size?: "xs" | "sm" | "default" | "lg";
  /** Spinner on the primary action; both buttons are disabled meanwhile. */
  loading?: boolean;
  disabled?: boolean;
  /** Accessible name of the chevron button; overrides `labels.menu`. @default "More actions" */
  menuLabel?: string;
  labels?: Partial<SplitButtonLabels>;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  type?: "button" | "submit";
  className?: string;
  "data-testid"?: string;
}

const CHEVRON_SIZE = { xs: "icon-xs", sm: "icon-sm", default: "icon", lg: "icon-lg" } as const;

/**
 * Primary action with a joined chevron that opens the alternatives ("Send" | "Send and close",
 * "Send later"). Same joined look as `ButtonGroup`; the menu is a `DropdownMenu`, so the chevron
 * opens it with Enter/Space/ArrowDown, Escape closes it and focus returns to the chevron.
 */
export const SplitButton = forwardRef<HTMLButtonElement, SplitButtonProps>(
  (
    {
      children,
      onClick,
      items,
      variant = "default",
      size = "default",
      loading = false,
      disabled = false,
      menuLabel,
      labels,
      side = "bottom",
      align = "end",
      type = "button",
      className,
      "data-testid": testId,
    },
    ref,
  ) => {
    // Loading blocks interaction without the dimmed `disabled` look, so the spinner stays readable.
    const off = disabled;
    const block = "aria-disabled:pointer-events-none";
    return (
      <div className={cn("inline-flex max-w-full", className)} data-testid={testId}>
        <Button
          ref={ref}
          type={type}
          variant={variant}
          size={size}
          disabled={off}
          aria-busy={loading || undefined}
          aria-disabled={loading || undefined}
          onClick={loading ? undefined : onClick}
          className={cn("relative min-w-0 rounded-r-none hover:z-10 focus-visible:z-10", block)}
        >
          {loading ? <LoadingSpinner className="[&_svg]:text-current" /> : null}
          {children}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={variant}
              size={CHEVRON_SIZE[size]}
              disabled={off}
              aria-label={menuLabel ?? { ...defaultSplitButtonLabels, ...labels }.menu}
              aria-disabled={loading || undefined}
              tabIndex={loading ? -1 : undefined}
              className={cn("relative -ml-px w-8 shrink-0 rounded-l-none hover:z-10 focus-visible:z-10", block)}
            >
              <ChevronDownIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={side} align={align}>
            {items.map(({ id, label, onSelect, icon: Icon, disabled: itemDisabled, danger }) => (
              <DropdownMenuItem key={id} disabled={itemDisabled} danger={danger} onSelect={onSelect}>
                {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
);
SplitButton.displayName = "SplitButton";
