import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DialogActions } from "../../../src/patterns/modal/DialogActions";

describe("DialogActions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a single action before Cancel on Windows", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
    render(<DialogActions actions={[<button key="save">Save</button>]} cancel={<button>Cancel</button>} />);

    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toEqual(["Save", "Cancel"]);
  });

  it("renders Cancel before a single action on iOS, matching the system default", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );
    render(<DialogActions actions={[<button key="save">Save</button>]} cancel={<button>Cancel</button>} />);

    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toEqual(["Cancel", "Save"]);
  });

  it("keeps multiple actions in order, with Cancel trailing, on Windows", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
    render(
      <DialogActions
        actions={[
          <button key="dont-save">Don't Save</button>,
          <button key="save">Save</button>,
        ]}
        cancel={<button>Cancel</button>}
      />,
    );

    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toEqual(["Don't Save", "Save", "Cancel"]);
  });

  it("reverses multiple actions, with Cancel leading, on iOS — the action nearest Cancel stays the same", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );
    render(
      <DialogActions
        actions={[
          <button key="dont-save">Don't Save</button>,
          <button key="save">Save</button>,
        ]}
        cancel={<button>Cancel</button>}
      />,
    );

    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toEqual(["Cancel", "Save", "Don't Save"]);
  });
});
