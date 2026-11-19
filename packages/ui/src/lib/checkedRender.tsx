import type { HTMLAttributes, Ref } from "react";
import { checkedState } from "./radixCompat";

type PartProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> };

/** Base UI `render` adding Radix's `data-state` (checked | unchecked | indeterminate), which apps' CSS and tests select on. */
export const withCheckedState =
  (Tag: "button" | "span") =>
  (props: PartProps, state: { checked: boolean; indeterminate?: boolean }) => (
    <Tag {...(props as object)} data-state={checkedState(state.indeterminate ? "indeterminate" : state.checked)} />
  );
