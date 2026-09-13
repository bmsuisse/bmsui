import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChoiceBlock, type ChoiceOption } from "../../../src/patterns/chat/ChoiceBlock";

const SHORT_OPTIONS: ChoiceOption[] = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
];

const FOUR_OPTIONS: ChoiceOption[] = [
  { id: "a", label: "Option A", description: "First choice" },
  { id: "b", label: "Option B" },
  { id: "c", label: "Option C" },
  { id: "d", label: "Option D" },
];

describe("ChoiceBlock", () => {
  it("renders the question and all option labels", () => {
    render(<ChoiceBlock question="Pick one" options={FOUR_OPTIONS} />);
    expect(screen.getByText("Pick one")).toBeInTheDocument();
    for (const option of FOUR_OPTIONS) {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    }
  });

  it("calls onSelect with the clicked option, but not for a disabled option", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const options: ChoiceOption[] = [FOUR_OPTIONS[0]!, { ...FOUR_OPTIONS[1]!, disabled: true }];
    render(<ChoiceBlock question="Pick one" options={options} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /Option A/ }));
    expect(onSelect).toHaveBeenCalledWith(options[0]);

    onSelect.mockClear();
    await user.click(screen.getByRole("button", { name: /Option B/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks the matching option aria-pressed=true and others false via value", () => {
    render(<ChoiceBlock question="Pick one" options={FOUR_OPTIONS} value="b" />);
    expect(screen.getByRole("button", { name: /Option A/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Option B/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Option C/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("disabled prevents onSelect but keeps the value highlight", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChoiceBlock question="Pick one" options={FOUR_OPTIONS} value="b" disabled onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /Option A/ }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Option B/ })).toHaveAttribute("aria-pressed", "true");
  });

  describe("keyboard shortcuts", () => {
    it("pressing 1 selects the first option, 2 the second", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ChoiceBlock question="Pick one" options={FOUR_OPTIONS} onSelect={onSelect} />);

      await user.keyboard("1");
      expect(onSelect).toHaveBeenLastCalledWith(FOUR_OPTIONS[0]);

      await user.keyboard("2");
      expect(onSelect).toHaveBeenLastCalledWith(FOUR_OPTIONS[1]);
    });

    it("a keypress from a focused textarea does not select", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <div>
          <ChoiceBlock question="Pick one" options={FOUR_OPTIONS} onSelect={onSelect} />
          <textarea aria-label="composer" />
        </div>,
      );

      await user.click(screen.getByLabelText("composer"));
      await user.keyboard("1");
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("Ctrl+1 does not select", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ChoiceBlock question="Pick one" options={FOUR_OPTIONS} onSelect={onSelect} />);

      await user.keyboard("{Control>}1{/Control}");
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("keyboardShortcuts={false} disables shortcuts entirely", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ChoiceBlock question="Pick one" options={FOUR_OPTIONS} onSelect={onSelect} keyboardShortcuts={false} />);

      await user.keyboard("1");
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("shortcuts do nothing while disabled", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ChoiceBlock question="Pick one" options={FOUR_OPTIONS} onSelect={onSelect} disabled />);

      await user.keyboard("1");
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe("column heuristic", () => {
    it("uses a 2-col grid when all option labels are short", () => {
      render(<ChoiceBlock question="Approve?" options={SHORT_OPTIONS} />);
      expect(screen.getByRole("group")).toHaveClass("grid-cols-2");
    });

    it("uses a 1-col grid when any option label is long", () => {
      const options: ChoiceOption[] = [
        { id: "x", label: "This is a fairly long option label" },
        { id: "y", label: "Short" },
      ];
      render(<ChoiceBlock question="Pick one" options={options} />);
      expect(screen.getByRole("group")).toHaveClass("grid-cols-1");
      expect(screen.getByRole("group")).not.toHaveClass("grid-cols-2");
    });

    it("columns={1} overrides the heuristic", () => {
      render(<ChoiceBlock question="Approve?" options={SHORT_OPTIONS} columns={1} />);
      expect(screen.getByRole("group")).toHaveClass("grid-cols-1");
      expect(screen.getByRole("group")).not.toHaveClass("grid-cols-2");
    });
  });

  it("tone=warning renders the eyebrow and meta", () => {
    render(
      <ChoiceBlock
        question="Send this email?"
        options={SHORT_OPTIONS}
        tone="warning"
        eyebrow="Approval required"
        meta="send_mail"
      />,
    );
    expect(screen.getByText("Approval required")).toBeInTheDocument();
    expect(screen.getByText("send_mail")).toBeInTheDocument();
  });

  it("forwards the ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ChoiceBlock ref={ref} question="Pick one" options={SHORT_OPTIONS} className="custom-class" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("custom-class");
  });
});
