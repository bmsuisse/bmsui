import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodeBlock } from "../../../src/patterns/code-block/CodeBlock";

describe("CodeBlock", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  it("shows code and language", () => {
    render(<CodeBlock code={"select 1;"} language="sql" />);
    expect(screen.getByText("select 1;")).toBeInTheDocument();
    expect(screen.getByText("sql")).toBeInTheDocument();
  });

  it("copies the verbatim code and flips the label", async () => {
    render(<CodeBlock code={"a\nb"} language="txt" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("a\nb"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument());
  });

  it("can hide the copy button and header", () => {
    render(<CodeBlock code="x" copyable={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("numbers lines unless wrapping", () => {
    const { rerender } = render(<CodeBlock code={"a\nb\nc"} lineNumbers />);
    expect(screen.getByTestId("code-block-gutter").textContent).toBe("1\n2\n3");
    rerender(<CodeBlock code={"a\nb\nc"} lineNumbers wrap />);
    expect(screen.queryByTestId("code-block-gutter")).toBeNull();
  });

  it("renders through a highlight slot", () => {
    render(<CodeBlock code="let x" language="ts" highlight={(code) => <span data-testid="hl">{code.toUpperCase()}</span>} />);
    expect(screen.getByTestId("hl")).toHaveTextContent("LET X");
  });

  it("applies maxHeight to the scroll region", () => {
    render(<CodeBlock code="x" language="txt" maxHeight={120} />);
    expect(screen.getByRole("region", { name: "txt" })).toHaveStyle({ maxHeight: "120px" });
  });
});
