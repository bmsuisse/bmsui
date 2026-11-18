import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { Button } from "../../primitives/button";
import { useIntegratedI18n } from "../../i18n/locale";

export interface SearchTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible label, also used as the tooltip text by callers that wrap this in one. @default "Search" */
  label?: string;
}

/**
 * Icon-only header button that opens a search overlay (a `SearchPanel`, a
 * dropdown, a `Sheet` — this owns no state or panel of its own). For a
 * full-width always-visible input instead, use `SearchBar`.
 */
export function SearchTrigger({ label, ...props }: SearchTriggerProps): ReactElement {
  const { t } = useIntegratedI18n();
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label ?? t("searchTrigger.label")} {...props}>
      <MagnifyingGlassIcon className="h-[18px] w-[18px]" aria-hidden="true" />
    </Button>
  );
}
