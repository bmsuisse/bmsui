import type { HTMLAttributes, MouseEvent } from "react";
import { createContext, forwardRef, useContext } from "react";
import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "../../primitives/button";
import { Input, type InputProps } from "../../primitives/input";

type InputGroupSize = "sm" | "default";
const SizeContext = createContext<InputGroupSize>("default");

export interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** `sm` = h-8 like `Button size="sm"`. @default "default" (h-9, same as `Input`) */
  size?: InputGroupSize;
}

/**
 * A field with leading/trailing addons — an icon, a unit (`CHF`, `%`,
 * `https://`), or a small button (copy, clear, show password) — that looks and
 * focuses like one `Input`: the border and focus ring sit on the group.
 *
 * ```tsx
 * <InputGroup>
 *   <InputGroupAddon><MagnifyingGlassIcon /></InputGroupAddon>
 *   <InputGroupInput placeholder="Search" />
 *   <InputGroupButton aria-label="Clear"><XMarkIcon /></InputGroupButton>
 * </InputGroup>
 * ```
 * Use it instead of absolutely positioning icons over an `Input`. For a
 * stand-alone search field use `SearchBar`. The group's focus ring and
 * border fade in over 150 ms; buttons press to 95 %.
 */
export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(({ size = "default", className, onClick, ...props }, ref) => (
  <SizeContext.Provider value={size}>
    <div
      ref={ref}
      role="group"
      data-testid="input-group"
      data-size={size}
      className={cn(
        "flex w-full min-w-0 items-center rounded-md border border-input bg-transparent shadow-sm transition-[color,background-color,border-color,box-shadow] duration-150 ease-out",
        "focus-within:ring-1 focus-within:ring-ring",
        "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50",
        "has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-destructive",
        size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
        className,
      )}
      // Clicking an addon (not a button inside it) focuses the field, like a <label>.
      onClick={(e: MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
        const target = e.target as HTMLElement;
        if (e.defaultPrevented || target.closest("button, input, textarea, select, a")) return;
        e.currentTarget.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
      }}
      {...props}
    />
  </SizeContext.Provider>
));
InputGroup.displayName = "InputGroup";

/** Icon or text at the start or end of an `InputGroup` (muted; heroicons are sized automatically). */
export const InputGroupAddon = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const size = useContext(SizeContext);
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full shrink-0 select-none items-center gap-1.5 whitespace-nowrap text-muted-foreground first:pl-3 last:pr-3 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        size === "sm" ? "first:pl-2.5 last:pr-2.5 [&_svg]:size-3.5" : "[&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
});
InputGroupAddon.displayName = "InputGroupAddon";

/** The `Input` inside an `InputGroup`: borderless, ring-less, fills the remaining width. */
export const InputGroupInput = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  const size = useContext(SizeContext);
  return (
    <Input
      ref={ref}
      className={cn(
        "h-full flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0",
        // 1px more at the bottom lifts the text half a pixel so it shares a baseline with
        // addon text and button labels (input text otherwise renders ~1px lower).
        "pb-[5px]",
        "[&:not(:first-child)]:pl-2 [&:not(:last-child)]:pr-2",
        size === "sm" ? "px-2.5 text-xs" : "",
        className,
      )}
      {...props}
    />
  );
});
InputGroupInput.displayName = "InputGroupInput";

/** Small ghost `Button` inside an `InputGroup` (copy, clear, reveal…). Give icon-only buttons an `aria-label`. */
export const InputGroupButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size, type = "button", ...props }, ref) => {
    const groupSize = useContext(SizeContext);
    return (
      <Button
        ref={ref}
        type={type}
        variant={variant}
        size={size ?? (groupSize === "sm" ? "icon-xs" : "icon-sm")}
        className={cn(
          "shrink-0 transition-[color,background-color,scale] duration-150 ease-out first:ml-0.5 last:mr-0.5 active:scale-95 motion-reduce:scale-none!",
          groupSize === "sm" ? "h-6 [&_svg]:size-3.5" : "h-7",
          size == null && (groupSize === "sm" ? "w-6" : "w-7"),
          variant === "ghost" &&
            "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground data-[state=open]:bg-muted-foreground/10 data-[state=open]:text-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);
InputGroupButton.displayName = "InputGroupButton";
