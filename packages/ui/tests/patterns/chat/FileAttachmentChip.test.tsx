import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileAttachmentChip } from "../../../src/patterns/chat/FileAttachmentChip";

describe("FileAttachmentChip", () => {
  it("shows the name and a formatted size", () => {
    render(<FileAttachmentChip name="quote.pdf" size={245_000} />);
    expect(screen.getByText("quote.pdf")).toBeInTheDocument();
    expect(screen.getByText("239 KB")).toBeInTheDocument();
  });

  it("calls onRemove from the attach variant's remove button", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<FileAttachmentChip name="quote.pdf" onRemove={onRemove} />);
    await user.click(screen.getByRole("button", { name: /remove quote.pdf/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows a progress bar while uploading and hides the remove button", () => {
    render(<FileAttachmentChip name="quote.pdf" state="uploading" progress={40} onRemove={vi.fn()} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("shows the error message when state is error", () => {
    render(<FileAttachmentChip name="quote.pdf" state="error" error="Too large" />);
    expect(screen.getByText("Too large")).toBeInTheDocument();
  });

  it("calls onDownload from the export variant's download button", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    render(<FileAttachmentChip name="report.xlsx" variant="export" onDownload={onDownload} />);
    await user.click(screen.getByRole("button", { name: /download report.xlsx/i }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
