import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "../../lib/utils";

/**
 * Thin wrapper around react-day-picker's <DayPicker>, styled minimally via
 * Tailwind utility classes on the root element. Consumers must additionally
 * import "react-day-picker/style.css" (or supply their own equivalent day/
 * cell styling) — this package intentionally does not bundle that CSS so it
 * doesn't leak into consumers that style calendars differently.
 */
export type CalendarProps = ComponentProps<typeof DayPicker>;

export function Calendar({ className, ...props }: CalendarProps) {
  return <DayPicker className={cn("p-3", className)} {...props} />;
}
