import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "../../../src/primitives/input";
import { FormField } from "../../../src/patterns/form-field/FormField";

describe("FormField", () => {
  it("associates the label with the child control via a generated id", () => {
    render(
      <FormField label="Name">
        <Input placeholder="Jane Doe" />
      </FormField>,
    );
    expect(screen.getByLabelText("Name")).toBeInstanceOf(HTMLInputElement);
  });

  it("uses an explicit htmlFor for the label/control association", () => {
    render(
      <FormField label="Email" htmlFor="email-field">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("id", "email-field");
  });

  it("preserves a caller-provided id on the child instead of overwriting it", () => {
    render(
      <FormField label="Role">
        <Input id="custom-role-id" />
      </FormField>,
    );
    const input = screen.getByLabelText("Role");
    expect(input).toHaveAttribute("id", "custom-role-id");
  });

  it("renders error text with error-colored styling when `error` is set", () => {
    render(
      <FormField label="Email" error="Email is required">
        <Input />
      </FormField>,
    );
    const message = screen.getByText("Email is required");
    expect(message).toBeInTheDocument();
    expect(message).toHaveClass("text-destructive");
  });

  it("renders description text instead of an error when there's no error", () => {
    render(
      <FormField label="Email" description="We'll never share your email.">
        <Input />
      </FormField>,
    );
    const message = screen.getByText("We'll never share your email.");
    expect(message).toBeInTheDocument();
    expect(message).toHaveClass("text-muted-foreground");
    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
  });

  it("prefers the error over the description when both are provided", () => {
    render(
      <FormField label="Email" error="Invalid email" description="We'll never share your email.">
        <Input />
      </FormField>,
    );
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
    expect(screen.queryByText("We'll never share your email.")).not.toBeInTheDocument();
  });

  it("renders a required indicator only when `required` is true", () => {
    const { rerender } = render(
      <FormField label="Name" required>
        <Input />
      </FormField>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();

    rerender(
      <FormField label="Name">
        <Input />
      </FormField>,
    );
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("sets aria-invalid when there's an error, and omits it otherwise", () => {
    const { rerender } = render(
      <FormField label="Email" error="Invalid email">
        <Input />
      </FormField>,
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");

    rerender(
      <FormField label="Email">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).not.toBe("true");
  });

  it("points aria-describedby at the rendered error/description text", () => {
    render(
      <FormField label="Email" error="Invalid email">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Email");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent("Invalid email");
  });

  it("renders children as-is without throwing when children isn't a single valid element", () => {
    expect(() =>
      render(
        <FormField label="Notes">
          {/* @ts-expect-error intentionally passing multiple children to exercise the defensive path */}
          {["a", "b"]}
        </FormField>,
      ),
    ).not.toThrow();
  });
});
