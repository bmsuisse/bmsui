import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";

export type CalendarProps = ComponentProps<typeof DayPicker>;

/**
 * Wrapper around react-day-picker's <DayPicker>, styled entirely via
 * Tailwind utility classes on the same design tokens (`bg-primary`,
 * `bg-accent`, `border-input`, ...) the rest of this package's components
 * use — rather than relying on `react-day-picker`'s own bundled stylesheet,
 * which is a generic, unthemed look that clashes with a Popover/Button built
 * from these tokens. Consumers no longer need to import
 * `react-day-picker/style.css` (or anything else) for this to look right.
 */
export function Calendar({ className, classNames, ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      className={cn("w-fit", className)}
      classNames={{
        months: cn("flex flex-col gap-4 sm:flex-row", defaultClassNames.months),
        month: cn("flex flex-col gap-3", defaultClassNames.month),
        month_caption: cn("flex items-center justify-center px-8 h-8", defaultClassNames.month_caption),
        caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),
        nav: cn("flex items-center justify-between absolute inset-x-0 top-0 px-1", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 text-muted-foreground hover:text-foreground",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 text-muted-foreground hover:text-foreground",
          defaultClassNames.button_next,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "w-8 text-center text-[0.7rem] font-normal text-muted-foreground",
          defaultClassNames.weekday,
        ),
        week: cn("flex w-full mt-1", defaultClassNames.week),
        day: cn(
          "relative w-8 h-8 p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day,
        ),
        range_start: cn("rounded-l-md bg-accent", defaultClassNames.range_start),
        range_middle: cn("rounded-none bg-accent/40", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "[&:not([data-selected])]:text-primary [&:not([data-selected])]:font-semibold",
          defaultClassNames.today,
        ),
        outside: cn("text-muted-foreground/50", defaultClassNames.outside),
        disabled: cn("text-muted-foreground/30 line-through", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className={cn("h-4 w-4", chevronClassName)} aria-hidden />
          ) : (
            <ChevronRightIcon className={cn("h-4 w-4", chevronClassName)} aria-hidden />
          ),
        DayButton: ({ className: dayClassName, day: _day, modifiers, ...dayProps }) => (
          <button
            type="button"
            className={cn(
              "h-8 w-8 rounded-md text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:hover:bg-primary data-[selected=true]:hover:text-primary-foreground",
              modifiers.range_middle &&
                "data-[selected=true]:bg-transparent data-[selected=true]:text-foreground data-[selected=true]:hover:bg-accent",
              dayClassName,
            )}
            data-selected={modifiers.selected || undefined}
            {...dayProps}
          />
        ),
      }}
      {...props}
    />
  );
}
