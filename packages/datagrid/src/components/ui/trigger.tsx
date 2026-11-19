import { mergeProps } from "@base-ui/react/merge-props";
import { cloneElement, isValidElement, type HTMLAttributes, type ReactElement, type ReactNode } from "react";

type TriggerRender = (props: HTMLAttributes<HTMLElement>, state: { open: boolean }) => ReactElement;

/**
 * Radix's `asChild` and `data-state="open|closed"` on a Base UI trigger: datagrid's styles and
 * apps' tests read `data-state`, which Base UI replaces with `data-popup-open`.
 */
export function openTrigger(asChild: boolean | undefined, children: ReactNode): { render: TriggerRender } {
  const element: ReactElement<HTMLAttributes<HTMLElement>> =
    asChild && isValidElement<HTMLAttributes<HTMLElement>>(children) ? children : <button type="button">{children}</button>;
  return {
    render: (props, { open }) =>
      cloneElement(element, mergeProps<"button">(props, element.props, { "data-state": open ? "open" : "closed" } as HTMLAttributes<HTMLButtonElement>)),
  };
}
