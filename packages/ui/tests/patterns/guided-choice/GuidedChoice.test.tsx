import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GuidedChoice } from "../../../src/patterns/guided-choice/GuidedChoice";

const options = [
  { value: "a", label: "Sigma 12 cm", suggested: true },
  { value: "b", label: "Sigma 8 cm" },
  { value: "c", label: "Omega 12 cm" },
];

describe("GuidedChoice", () => {
  it("checks the suggestion first and confirms it with Enter", async () => {
    const onConfirm = vi.fn();
    render(<GuidedChoice title="Which product?" question="Pos. 10" options={options} onConfirm={onConfirm} />);
    expect(screen.getByRole("form", { name: "Which product?" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Sigma 12 cm" })).toBeChecked();
    expect(screen.getByText("Suggested")).toBeInTheDocument();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onConfirm).toHaveBeenCalledWith("a");
  });

  it("moves the pick with arrows and number keys", async () => {
    const onConfirm = vi.fn();
    render(<GuidedChoice title="Which product?" options={options} onConfirm={onConfirm} />);
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Sigma 8 cm" })).toBeChecked();
    await userEvent.keyboard("3");
    expect(screen.getByRole("radio", { name: "Omega 12 cm" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: /Confirm/ }));
    expect(onConfirm).toHaveBeenCalledWith("c");
  });

  it("confirms nothing until something is picked", async () => {
    const onConfirm = vi.fn();
    render(<GuidedChoice title="t" options={options.map((o) => ({ ...o, suggested: false }))} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: /Confirm/ }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables the form while pending and leaves number keys alone when shortcuts are off", async () => {
    render(<GuidedChoice title="t" options={options} onConfirm={() => undefined} pending shortcuts={false} />);
    expect(screen.getByRole("button", { name: /Working/ })).toBeDisabled();
    await userEvent.keyboard("2");
    expect(screen.getByRole("radio", { name: "Sigma 12 cm" })).toBeChecked();
  });
});
