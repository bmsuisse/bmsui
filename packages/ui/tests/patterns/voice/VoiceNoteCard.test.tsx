import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VoiceNoteCard } from "../../../src/patterns/voice/VoiceNoteCard";

describe("VoiceNoteCard", () => {
  it("renders a trigger row when closed and calls onOpen", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <VoiceNoteCard
        open={false}
        onOpen={onOpen}
        onClose={vi.fn()}
        value=""
        onValueChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("Fill by voice")).toBeInTheDocument();
    await user.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("renders the textarea and forwards edits when open", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <VoiceNoteCard
        open
        onOpen={vi.fn()}
        onClose={vi.fn()}
        value=""
        onValueChange={onValueChange}
        onSubmit={vi.fn()}
      />,
    );
    await user.type(screen.getByPlaceholderText("Speak or type…"), "a");
    expect(onValueChange).toHaveBeenCalledWith("a");
  });

  it("disables submit until there is text, and shows a spinner while submitting", () => {
    const { rerender } = render(
      <VoiceNoteCard
        open
        onOpen={vi.fn()}
        onClose={vi.fn()}
        value=""
        onValueChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /extract with ai/i })).toBeDisabled();

    rerender(
      <VoiceNoteCard
        open
        onOpen={vi.fn()}
        onClose={vi.fn()}
        value="some notes"
        onValueChange={vi.fn()}
        onSubmit={vi.fn()}
        submitting
      />,
    );
    expect(screen.getByRole("button", { name: /extract with ai/i })).toBeDisabled();
  });

  it("calls onClose from the close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <VoiceNoteCard
        open
        onOpen={vi.fn()}
        onClose={onClose}
        value=""
        onValueChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
