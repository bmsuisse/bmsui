import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "../../../src/patterns/copy-button/CopyButton";

afterEach(() => {
  vi.useRealTimers();
});

describe("CopyButton", () => {
  it("copies, flips its name to Copied and back", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onCopy = vi.fn();
    render(<CopyButton value="abc" onCopy={onCopy} />);
    const button = screen.getByRole("button", { name: "Copy" });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(writeText).toHaveBeenCalledWith("abc");
    expect(onCopy).toHaveBeenCalledWith("abc");
    expect(screen.getByRole("button", { name: "Copied" })).toHaveAttribute("data-state", "copied");
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("shows the failed state when the clipboard rejects", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<CopyButton value="abc" labels={{ failed: "Nope" }} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("button", { name: "Nope" })).toHaveAttribute("data-state", "failed");
  });

  it("shows visible text children and swaps them for the result", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    render(<CopyButton value="x">Copy link</CopyButton>);
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("button")).toHaveTextContent("Copied");
  });
});
