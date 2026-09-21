import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DialogActions } from "../../../src/patterns/modal/DialogActions";

describe("DialogActions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders primary before secondary on Windows", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
    render(<DialogActions primary={<button>Save</button>} secondary={<button>Cancel</button>} />);

    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toEqual(["Save", "Cancel"]);
  });

  it("renders secondary before primary on iOS, matching the system default", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );
    render(<DialogActions primary={<button>Save</button>} secondary={<button>Cancel</button>} />);

    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toEqual(["Cancel", "Save"]);
  });
});
