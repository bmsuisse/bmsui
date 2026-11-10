import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MetadataList } from "../../../src/patterns/metadata-list/MetadataList";

describe("MetadataList", () => {
  it("renders label/value pairs as a description list", () => {
    render(<MetadataList items={[{ label: "Customer no.", value: "100234" }, { label: "City", value: "Bern" }]} />);
    const list = screen.getByTestId("metadata-list");
    expect(list.tagName).toBe("DL");
    expect(within(list).getAllByRole("term").map((t) => t.textContent)).toEqual(["Customer no.", "City"]);
    expect(within(list).getAllByRole("definition").map((d) => d.textContent)).toEqual(["100234", "Bern"]);
  });

  it("shows the placeholder for null, undefined and empty values, translatable via labels", () => {
    const { rerender } = render(
      <MetadataList items={[{ label: "A", value: null }, { label: "B" }, { label: "C", value: "" }, { label: "D", value: 0 }]} />,
    );
    expect(screen.getAllByTestId("metadata-empty")).toHaveLength(3);
    expect(screen.getAllByTestId("metadata-empty")[0]).toHaveTextContent("—");
    expect(screen.getByText("0")).toBeInTheDocument();
    rerender(<MetadataList items={[{ label: "A" }]} labels={{ empty: "n/a" }} />);
    expect(screen.getByTestId("metadata-empty")).toHaveTextContent("n/a");
  });

  it("applies the layout and responsive column classes", () => {
    render(<MetadataList layout="horizontal" columns={3} items={[{ label: "A", value: "1", fullWidth: true }]} />);
    const list = screen.getByTestId("metadata-list");
    expect(list).toHaveAttribute("data-layout", "horizontal");
    expect(list.className).toContain("lg:grid-cols-3");
    expect(screen.getByTestId("metadata-item").className).toContain("lg:col-span-3");
  });

  it("copies a value to the clipboard and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <MetadataList
        copyable
        items={[
          { label: "IBAN", value: "CH93 0076 2011 6238 5295 7" },
          { label: "Empty" },
          { label: "Node", value: <b>x</b> },
          { label: "Custom", value: <b>y</b>, copyValue: "raw-y" },
        ]}
      />,
    );
    const buttons = screen.getAllByTestId("metadata-copy");
    expect(buttons).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Copy IBAN" }));
    expect(writeText).toHaveBeenCalledWith("CH93 0076 2011 6238 5295 7");
    await waitFor(() => expect(screen.getAllByRole("status").map((s) => s.textContent)).toContain("Copied"));
    fireEvent.click(screen.getByRole("button", { name: "Copy Custom" }));
    expect(writeText).toHaveBeenLastCalledWith("raw-y");
  });

  it("lets a single item opt out of copying", () => {
    render(<MetadataList copyable items={[{ label: "A", value: "1", copyable: false }, { label: "B", value: "2" }]} />);
    expect(screen.getAllByTestId("metadata-copy")).toHaveLength(1);
  });
});
