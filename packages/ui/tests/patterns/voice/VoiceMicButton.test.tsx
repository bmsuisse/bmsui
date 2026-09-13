import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VoiceMicButton } from "../../../src/patterns/voice/VoiceMicButton";

describe("VoiceMicButton", () => {
  it("calls onToggle when clicked while idle", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<VoiceMicButton onToggle={onToggle} />);
    await user.click(screen.getByRole("button", { name: /start voice input/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("labels the button as stop while recording", () => {
    render(<VoiceMicButton state="recording" />);
    expect(screen.getByRole("button", { name: /stop recording/i })).toBeInTheDocument();
  });

  it("disables the button while transcribing", () => {
    render(<VoiceMicButton state="transcribing" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows the error message in a tooltip without disabling the button", () => {
    render(<VoiceMicButton error="Mic permission denied" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Mic permission denied");
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});
