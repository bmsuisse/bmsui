import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FileInput, type FileInputProps, formatFileSize, matchesAccept } from "../../../src/patterns/file-input/FileInput";

const file = (name: string, size = 10, type = "") => new File(["x".repeat(size)], name, { type });

const Controlled = ({ onChange = () => {}, ...props }: Partial<FileInputProps> & { onChange?: (f: File[]) => void }) => {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <FileInput
      data-testid="upload"
      {...props}
      files={files}
      onFilesChange={(next) => {
        setFiles(next);
        onChange(next);
      }}
    />
  );
};

const drop = (files: File[]) =>
  fireEvent.drop(screen.getByTestId("upload-dropzone"), { dataTransfer: { files, types: ["Files"] } });

describe("helpers", () => {
  it("formats sizes and matches accept rules", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(184_320)).toBe("180 KB");
    expect(formatFileSize(2_400_000)).toBe("2.3 MB");
    expect(matchesAccept(file("a.PDF"), ".pdf,.docx")).toBe(true);
    expect(matchesAccept(file("a.png", 1, "image/png"), "image/*")).toBe(true);
    expect(matchesAccept(file("a.txt", 1, "text/plain"), "image/*,.pdf")).toBe(false);
    expect(matchesAccept(file("a.txt"), undefined)).toBe(true);
  });
});

describe("FileInput", () => {
  it("adds picked files and lists them with a remove button", () => {
    const onChange = vi.fn();
    render(<Controlled multiple onChange={onChange} />);
    fireEvent.change(screen.getByTestId("upload-native"), { target: { files: [file("a.pdf"), file("b.pdf")] } });
    expect(onChange).toHaveBeenLastCalledWith([expect.any(File), expect.any(File)]);
    expect(screen.getByText("a.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove a.pdf" }));
    expect(screen.queryByText("a.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("b.pdf")).toBeInTheDocument();
  });

  it("accepts drops, appending with multiple and skipping duplicates", () => {
    const onChange = vi.fn();
    render(<Controlled multiple onChange={onChange} />);
    const a = file("a.pdf");
    drop([a]);
    drop([a, file("c.pdf")]);
    expect(onChange.mock.calls.at(-1)?.[0].map((f: File) => f.name)).toEqual(["a.pdf", "c.pdf"]);
  });

  it("replaces the file without multiple", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    drop([file("a.pdf")]);
    drop([file("b.pdf")]);
    expect(onChange.mock.calls.at(-1)?.[0].map((f: File) => f.name)).toEqual(["b.pdf"]);
    expect(screen.getByText("Drop a file here or click to browse")).toBeInTheDocument();
  });

  it("rejects wrong types and too large files with visible errors", () => {
    const onReject = vi.fn();
    const onChange = vi.fn();
    render(<Controlled multiple accept=".pdf" maxSize={100} onReject={onReject} onChange={onChange} />);
    drop([file("ok.pdf", 50), file("big.pdf", 500), file("x.exe", 5)]);
    expect(onChange.mock.calls.at(-1)?.[0].map((f: File) => f.name)).toEqual(["ok.pdf"]);
    expect(onReject.mock.calls[0]?.[0].map((r: { reason: string }) => r.reason)).toEqual(["too-large", "wrong-type"]);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("big.pdf is larger than 100 B.");
    expect(alert).toHaveTextContent("x.exe is not an accepted file type.");
  });

  it("enforces maxFiles", () => {
    const onChange = vi.fn();
    render(<Controlled multiple maxFiles={2} onChange={onChange} />);
    drop([file("a"), file("b"), file("c")]);
    expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("At most 2 files.");
  });

  it("opens the picker from the keyboard and shows the drag state", () => {
    render(<Controlled />);
    const zone = screen.getByTestId("upload-dropzone");
    const native = screen.getByTestId("upload-native") as HTMLInputElement;
    const click = vi.spyOn(native, "click");
    fireEvent.keyDown(zone, { key: "Enter" });
    expect(click).toHaveBeenCalled();
    fireEvent.dragEnter(zone, { dataTransfer: { types: ["Files"] } });
    expect(zone).toHaveAttribute("data-drag-over", "true");
    expect(screen.getByText("Drop to add")).toBeInTheDocument();
    fireEvent.dragLeave(zone, { dataTransfer: { types: ["Files"] } });
    expect(zone).not.toHaveAttribute("data-drag-over");
  });

  it("does nothing when disabled", () => {
    const onChange = vi.fn();
    render(<Controlled disabled onChange={onChange} />);
    drop([file("a.pdf")]);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("upload-dropzone")).toHaveAttribute("aria-disabled", "true");
  });
});
