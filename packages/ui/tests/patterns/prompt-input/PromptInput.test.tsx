import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PromptInput } from "../../../src/patterns/prompt-input/PromptInput";

describe("PromptInput", () => {
  it("submits trimmed text on Enter and clears (uncontrolled)", async () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const field = screen.getByRole("textbox", { name: "Message" });
    await userEvent.type(field, "  hello  {Enter}");
    expect(onSubmit).toHaveBeenCalledWith("hello");
    expect(field).toHaveValue("");
  });

  it("Shift+Enter inserts a newline instead of submitting", async () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const field = screen.getByRole("textbox");
    await userEvent.type(field, "a{Shift>}{Enter}{/Shift}b");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(field).toHaveValue("a\nb");
  });

  it("mod-enter mode needs Ctrl/Cmd+Enter", async () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} submitOn="mod-enter" />);
    const field = screen.getByRole("textbox");
    await userEvent.type(field, "hi{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.type(field, "{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledWith("hi");
  });

  it("ignores Enter that confirms an IME composition", () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} defaultValue="にほん" />);
    const field = screen.getByRole("textbox");
    fireEvent.keyDown(field, { key: "Enter", isComposing: true });
    fireEvent.keyDown(field, { key: "Enter", keyCode: 229 });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps the draft when onSubmit returns false", async () => {
    render(<PromptInput onSubmit={() => false} />);
    const field = screen.getByRole("textbox");
    await userEvent.type(field, "keep{Enter}");
    expect(field).toHaveValue("keep");
  });

  it("works controlled", async () => {
    const onValueChange = vi.fn();
    render(<PromptInput value="abc" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByRole("textbox"), "d");
    expect(onValueChange).toHaveBeenCalledWith("abcd");
    expect(screen.getByRole("textbox")).toHaveValue("abc");
  });

  it("disables Send when empty and swaps it for Stop while streaming", async () => {
    const onStop = vi.fn();
    const { rerender } = render(<PromptInput />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    rerender(<PromptInput streaming onStop={onStop} defaultValue="x" />);
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalled();
  });

  it("does not submit while streaming or disabled", async () => {
    const onSubmit = vi.fn();
    render(<PromptInput streaming onSubmit={onSubmit} defaultValue="x" />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders slots and custom labels", () => {
    render(
      <PromptInput
        attachments={<span>file.pdf</span>}
        leading={<button type="button">attach</button>}
        actions={<button type="button">mic</button>}
        labels={{ message: "Nachricht", send: "Senden" }}
        defaultValue="x"
      />,
    );
    expect(screen.getByText("file.pdf")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nachricht" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Senden" })).toBeEnabled();
  });
});
