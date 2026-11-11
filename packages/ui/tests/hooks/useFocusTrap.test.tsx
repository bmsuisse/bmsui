import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useFocusTrap, type UseFocusTrapOptions } from "../../src/hooks/useFocusTrap";

function Trap({ options, children }: { options?: UseFocusTrapOptions; children?: React.ReactNode }) {
  const ref = useFocusTrap<HTMLDivElement>(options);
  return (
    <div ref={ref} data-testid="trap">
      {children ?? (
        <>
          <button type="button">first</button>
          <button type="button" disabled>
            disabled
          </button>
          <input aria-label="middle" />
          <button type="button" hidden>
            hidden
          </button>
          <button type="button">last</button>
        </>
      )}
    </div>
  );
}

function Harness({ options }: { options?: UseFocusTrapOptions }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)}>
        toggle
      </button>
      <button type="button">outside</button>
      {open && <Trap options={options} />}
      {open && (
        <button type="button" onClick={() => setOpen(false)}>
          close-outside
        </button>
      )}
    </>
  );
}

describe("useFocusTrap", () => {
  it("focuses the first tabbable and cycles Tab / Shift+Tab", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("toggle"));
    expect(screen.getByText("first")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("middle")).toHaveFocus();
    await user.tab();
    expect(screen.getByText("last")).toHaveFocus();
    await user.tab();
    expect(screen.getByText("first")).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByText("last")).toHaveFocus();
  });

  it("pulls escaped focus back and restores focus on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const toggle = screen.getByText("toggle");
    await user.click(toggle);
    act(() => screen.getByText("outside").focus());
    expect(screen.getByText("first")).toHaveFocus();
    // Toggle again from within the trap via keyboard-equivalent: unmount the trap.
    act(() => toggle.click());
    await act(async () => {
      await Promise.resolve();
    });
    expect(toggle).toHaveFocus();
  });

  it("focuses the container when it has no tabbable children", async () => {
    render(<Trap>{<p>text only</p>}</Trap>);
    expect(screen.getByTestId("trap")).toHaveFocus();
    expect(screen.getByTestId("trap")).toHaveAttribute("tabindex", "-1");
  });

  it("does nothing when disabled", () => {
    render(<Trap options={{ enabled: false }} />);
    expect(document.body).toHaveFocus();
  });

  it("skips disabled controls with an explicit tabindex and controls inside hidden ancestors", async () => {
    const user = userEvent.setup();
    render(
      <Trap>
        <button type="button">first</button>
        <button type="button">last</button>
        <button type="button" tabIndex={0} disabled>
          disabled-with-tabindex
        </button>
        <div style={{ display: "none" }}>
          <button type="button">in-hidden-ancestor</button>
        </div>
      </Trap>,
    );
    screen.getByText("first").focus();
    await user.tab({ shift: true });
    expect(screen.getByText("last")).toHaveFocus();
  });
});
