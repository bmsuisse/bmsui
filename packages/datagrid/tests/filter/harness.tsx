import type { ComponentType, ReactElement } from "react";
import { useState } from "react";
import type { FilterDescriptor } from "../../src/filter/types";
import type { FilterWidgetProps } from "../../src/filter/widget-types";

/**
 * Wraps a filter widget with real controlled-component state, mirroring how
 * a parent grid actually drives it. Without this, testing a widget with a
 * static `value` prop and asserting cumulative `onChange` calls across
 * multiple keystrokes is misleading: React re-renders the (still-static)
 * `value` back onto the input after every keystroke, so each keystroke
 * appears to type into a freshly emptied field instead of accumulating.
 */
export function ControlledFilter<TColumn, TExtra extends object = Record<string, never>>({
  Widget,
  column,
  initial,
  onChangeSpy,
  extraProps,
}: {
  Widget: ComponentType<FilterWidgetProps<TColumn> & TExtra>;
  column: TColumn;
  initial?: FilterDescriptor;
  onChangeSpy?: (next: FilterDescriptor | undefined) => void;
  extraProps?: TExtra;
}): ReactElement {
  const [value, setValue] = useState<FilterDescriptor | undefined>(initial);
  return (
    <Widget
      column={column}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChangeSpy?.(next);
      }}
      {...(extraProps ?? ({} as TExtra))}
    />
  );
}
