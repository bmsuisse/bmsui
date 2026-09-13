import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VoiceCapturePanel } from "../../../src/patterns/voice/VoiceCapturePanel";

describe("VoiceCapturePanel", () => {
  it("renders nothing when closed", () => {
    render(<VoiceCapturePanel open={false} audioLevel={0} onStop={vi.fn()} />);
    expect(screen.queryByText("Listening…")).not.toBeInTheDocument();
  });

  it("shows the listening status by default and the transcribing/reconnecting labels when set", () => {
    const { rerender } = render(<VoiceCapturePanel open audioLevel={0.4} onStop={vi.fn()} />);
    expect(screen.getAllByText("Listening…").length).toBeGreaterThan(0);

    rerender(<VoiceCapturePanel open audioLevel={0.4} status="transcribing" onStop={vi.fn()} />);
    expect(screen.getAllByText("Transcribing…").length).toBeGreaterThan(0);
  });

  it("shows the placeholder until a transcript exists, then the transcript plus live partial", () => {
    const { rerender } = render(<VoiceCapturePanel open audioLevel={0} onStop={vi.fn()} />);
    expect(screen.getAllByText("Start speaking…").length).toBeGreaterThan(0);

    rerender(<VoiceCapturePanel open audioLevel={0} transcript="Call the customer" partial="tomorrow" onStop={vi.fn()} />);
    expect(screen.getAllByText("Call the customer tomorrow").length).toBeGreaterThan(0);
  });

  it("calls onStop from the Done button and onDiscard from Cancel", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    const onDiscard = vi.fn();
    render(<VoiceCapturePanel open audioLevel={0} onStop={onStop} onDiscard={onDiscard} />);

    await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]!);
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole("button", { name: "Done" })[0]!);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("renders the tabs slot when provided", () => {
    render(<VoiceCapturePanel open audioLevel={0} onStop={vi.fn()} tabs={<div>Language picker</div>} />);
    expect(screen.getAllByText("Language picker").length).toBeGreaterThan(0);
  });
});
