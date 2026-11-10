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

describe("FileInput review fixes", () => {
  it("single mode keeps the first acceptable file and rejects only the other acceptable ones", () => {
    const onChange = vi.fn();
    const onReject = vi.fn();
    render(<Controlled accept=".pdf" onChange={onChange} onReject={onReject} />);
    drop([file("a.txt"), file("b.pdf"), file("c.pdf")]);
    expect(onChange.mock.calls.at(-1)?.[0].map((f: File) => f.name)).toEqual(["b.pdf"]);
    const reasons = onReject.mock.calls.at(-1)?.[0].map((r: { file: File; reason: string }) => [r.file.name, r.reason]);
    expect(reasons).toEqual([
      ["a.txt", "wrong-type"],
      ["c.pdf", "too-many"],
    ]);
  });

  it("still prevents the browser default for drops while disabled", () => {
    const onChange = vi.fn();
    render(<Controlled disabled onChange={onChange} />);
    const zone = screen.getByTestId("upload-dropzone");
    expect(zone.className).not.toContain("pointer-events-none");
    const dataTransfer = { files: [file("a.pdf")], types: ["Files"], dropEffect: "copy" };
    expect(fireEvent.dragOver(zone, { dataTransfer })).toBe(false);
    expect(fireEvent.drop(zone, { dataTransfer })).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("formats sizes in the given locale and has no half-working name", () => {
    render(<Controlled locale="de-DE" maxSize={1_572_864} />);
    drop([file("big.pdf", 2_000_000)]);
    expect(screen.getByRole("alert")).toHaveTextContent("big.pdf is larger than 1,5 MB.");
    expect(screen.getByTestId("upload-native")).not.toHaveAttribute("name");
  });
});
