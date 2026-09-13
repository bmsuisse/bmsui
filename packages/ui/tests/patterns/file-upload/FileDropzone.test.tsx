import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileDropzone } from "../../../src/patterns/file-upload/FileDropzone";

describe("FileDropzone", () => {
  it("renders the default label and a custom hint", () => {
    render(<FileDropzone onFiles={vi.fn()} hint="PDF or DOCX, up to 10 MB" />);
    expect(screen.getByText("Drag files here, or click to browse")).toBeInTheDocument();
    expect(screen.getByText("PDF or DOCX, up to 10 MB")).toBeInTheDocument();
  });

  it("calls onFiles when a file is picked through the hidden input", async () => {
    const user = userEvent.setup();
    const onFiles = vi.fn();
    render(<FileDropzone onFiles={onFiles} />);
    const file = new File(["hi"], "spec.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it("does not open the file picker or call onFiles while disabled", () => {
    const onFiles = vi.fn();
    render(<FileDropzone onFiles={onFiles} disabled />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
  });
});
