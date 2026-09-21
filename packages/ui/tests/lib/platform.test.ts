import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfirmButtonPlacement, isWindowsPlatform } from "../../src/lib/platform";

describe("isWindowsPlatform", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for a Windows UA", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
    expect(isWindowsPlatform()).toBe(true);
  });

  it("returns false for an iOS UA", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );
    expect(isWindowsPlatform()).toBe(false);
  });

  it("returns false for a macOS UA", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    );
    expect(isWindowsPlatform()).toBe(false);
  });
});

describe("getConfirmButtonPlacement", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("places the confirm button leading (left) on Windows", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
    expect(getConfirmButtonPlacement()).toBe("leading");
  });

  it("places the confirm button trailing (right) on iOS, matching the system default", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );
    expect(getConfirmButtonPlacement()).toBe("trailing");
  });
});
