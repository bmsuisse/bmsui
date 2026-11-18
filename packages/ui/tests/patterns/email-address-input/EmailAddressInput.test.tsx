import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  EmailAddressInput,
  isValidEmail,
  parseEmailAddresses,
} from "../../../src/patterns/email-address-input/EmailAddressInput";

function Controlled(props: Partial<React.ComponentProps<typeof EmailAddressInput>>) {
  const [v, setV] = useState<string[]>(props.defaultValue ?? []);
  return <EmailAddressInput aria-label="To" {...props} value={v} onValueChange={setV} />;
}

describe("helpers", () => {
  it("validates addresses", () => {
    expect(isValidEmail("verkauf@muster-ag.ch")).toBe(true);
    expect(isValidEmail("verkauf@muster")).toBe(false);
    expect(isValidEmail("a b@c.ch")).toBe(false);
  });
  it("parses lists, names and duplicates", () => {
    expect(parseEmailAddresses("a@b.ch; C@d.ch, a@B.ch nope; Max Muster <m@x.ch>")).toEqual({
      valid: ["a@b.ch", "C@d.ch", "m@x.ch"],
      invalid: ["nope"],
    });
  });
});

describe("EmailAddressInput", () => {
  it("commits on Enter, comma and blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<EmailAddressInput aria-label="To" onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "a@b.ch{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(["a@b.ch"]);
    await user.type(input, "c@d.ch,");
    expect(onValueChange).toHaveBeenLastCalledWith(["a@b.ch", "c@d.ch"]);
    await user.type(input, "e@f.ch");
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(["a@b.ch", "c@d.ch", "e@f.ch"]);
  });

  it("ignores duplicates case-insensitively", async () => {
    const user = userEvent.setup();
    render(<Controlled defaultValue={["a@b.ch"]} />);
    await user.type(screen.getByRole("textbox"), "A@B.CH{Enter}");
    expect(screen.getAllByRole("button", { name: /^Remove/ })).toHaveLength(1);
  });

  it("splits a paste and keeps the name as title", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<EmailAddressInput aria-label="To" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("textbox"));
    await user.paste("Anna Keller <anna@keller.ch>; bob@x.ch");
    expect(onValueChange).toHaveBeenLastCalledWith(["anna@keller.ch", "bob@x.ch"]);
    expect(screen.getByText("anna@keller.ch").closest("[title]")).toHaveAttribute("title", "Anna Keller");
  });

  it("marks invalid addresses and links the message", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.type(screen.getByRole("textbox"), "nope{Enter}");
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const msg = screen.getByText("Check the highlighted addresses.");
    expect(input.getAttribute("aria-describedby")).toContain(msg.id);
  });

  it("removes the last chip on Backspace and any chip via x", async () => {
    const user = userEvent.setup();
    render(<Controlled defaultValue={["a@b.ch", "c@d.ch"]} />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("{Backspace}");
    expect(screen.queryByText("c@d.ch")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Remove a@b.ch" }));
    expect(screen.queryByText("a@b.ch")).toBeNull();
  });

  it("respects maxItems", async () => {
    const user = userEvent.setup();
    render(<Controlled maxItems={1} />);
    await user.type(screen.getByRole("textbox"), "a@b.ch{Enter}");
    expect(screen.getByText("At most 1 addresses.")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("offers suggestions with arrow keys and Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <EmailAddressInput
        aria-label="To"
        onValueChange={onValueChange}
        suggestions={[
          { email: "anna@keller.ch", name: "Anna Keller" },
          { email: "bob@keller.ch", name: "Bob Keller" },
        ]}
      />,
    );
    await user.type(screen.getByRole("combobox"), "kel");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(["bob@keller.ch"]);
  });

  it("focuses the input when the field is clicked and supports a hidden input", () => {
    render(<EmailAddressInput aria-label="To" name="to" defaultValue={["a@b.ch", "c@d.ch"]} />);
    fireEvent.click(screen.getByRole("group"));
    expect(screen.getByRole("textbox")).toHaveFocus();
    expect(document.querySelector('input[type="hidden"]')).toHaveValue("a@b.ch,c@d.ch");
  });
});
