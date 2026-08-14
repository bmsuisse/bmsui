import type { ReactElement } from "react";
import { cloneElement, isValidElement, useId } from "react";
import { cn } from "../../lib/utils";
import { Label } from "../../primitives/label";

export interface FormFieldProps {
  /** Visible label text for the field. */
  label: string;
  /** Explicit id to associate the label with the child control. Auto-generated when omitted. */
  htmlFor?: string;
  /** Validation error text. When set, takes precedence over `description` and marks the child as invalid. */
  error?: string;
  /** Helper text shown below the child control when there's no `error`. */
  description?: string;
  /** Renders a visual "required" indicator next to the label. */
  required?: boolean;
  /** The single form control (e.g. `Input`, `Textarea`, `Select`) this field wraps. */
  children: ReactElement;
  /** Additional class names for the outer wrapper. */
  className?: string;
}

/**
 * Wraps a single form control with a `Label`, optional required indicator, and
 * either an `error` or `description` message — the "label + input + error"
 * pattern used throughout the consuming apps' forms.
 *
 * Handles id plumbing automatically: generates a stable id (via `useId`) for
 * the label/control pair unless `htmlFor` or the child's own `id` is set, and
 * wires up `aria-invalid` / `aria-describedby` so the error or description
 * text is announced by assistive tech.
 */
export function FormField({
  label,
  htmlFor,
  error,
  description,
  required,
  children,
  className,
}: FormFieldProps): ReactElement {
  const generatedId = useId();
  const resolvedId = htmlFor ?? generatedId;
  const isSingleElement = isValidElement(children);
  const existingChildId = isSingleElement
    ? (children.props as { id?: string }).id
    : undefined;
  const effectiveId = existingChildId ?? resolvedId;

  const message = error ?? description;
  const messageId = message ? `${effectiveId}-message` : undefined;

  const child = isSingleElement
    ? cloneElement(
        children as ReactElement<{
          id?: string;
          "aria-invalid"?: boolean;
          "aria-describedby"?: string;
        }>,
        {
          id: effectiveId,
          ...(error ? { "aria-invalid": true } : {}),
          ...(messageId ? { "aria-describedby": messageId } : {}),
        },
      )
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={effectiveId}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      {child}
      {error ? (
        <p id={messageId} className="text-sm text-destructive">
          {error}
        </p>
      ) : description ? (
        <p id={messageId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
