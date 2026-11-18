import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttachmentList } from "../../../src/patterns/attachment-list/AttachmentList";
import { formatFileSize } from "../../../src/patterns/file-input/FileInput";

const files = [
  { id: "1", name: "Offerte 2026-0412.pdf", size: 1234567, mimeType: "application/pdf", href: "/f/1" },
  { id: "2", name: "Foto.png", size: 800, mimeType: "image/png" },
];

describe("formatFileSize", () => {
  it("formats units", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(800)).toBe("800 B");
    expect(formatFileSize(1234567)).toBe("1.2 MB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });
  it("uses the locale decimal mark", () => {
    expect(formatFileSize(1234567, "de-DE")).toBe("1,2 MB");
  });
});

describe("AttachmentList", () => {
  it("shows count, names, sizes and download link", () => {
    render(<AttachmentList attachments={files} />);
    expect(screen.getAllByText("2 attachments").length).toBeGreaterThan(0);
    expect(screen.getByText("1.2 MB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download: Offerte 2026-0412.pdf" })).toHaveAttribute("href", "/f/1");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
  it("renders nothing when empty", () => {
    const { container } = render(<AttachmentList attachments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("removes in compose mode", () => {
    const onRemove = vi.fn();
    render(<AttachmentList attachments={files} onRemove={onRemove} layout="chips" />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Foto.png" }));
    expect(onRemove).toHaveBeenCalledWith("2");
  });
  it("has no remove buttons without onRemove and supports labels", () => {
    render(<AttachmentList attachments={files} labels={{ attachments: (n) => `${n} Anhänge` }} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getAllByText("2 Anhänge").length).toBeGreaterThan(0);
  });
});
