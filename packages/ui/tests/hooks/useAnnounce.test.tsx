import { render, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { announce, Announcer, useAnnounce } from "../../src/hooks/useAnnounce";

const region = (politeness: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-bmsui-announcer="${politeness}"]`);

describe("useAnnounce", () => {
  it("creates shared body-level regions lazily and reuses them", () => {
    const { result } = renderHook(() => useAnnounce());
    result.current("Saved");
    const polite = region("polite");
    expect(polite).not.toBeNull();
    expect(polite).toHaveAttribute("aria-live", "polite");
    expect(polite).toHaveTextContent("Saved");
    expect(polite!.parentElement).toBe(document.body);

    announce("Saved again");
    expect(document.querySelectorAll('[data-bmsui-announcer="polite"]')).toHaveLength(1);
    expect(polite).toHaveTextContent("Saved again");
  });

  it("re-announces identical text with a fresh node", () => {
    announce("Same");
    const first = region("polite")!.firstChild;
    announce("Same");
    expect(region("polite")!.firstChild).not.toBe(first);
  });

  it("routes assertive messages to the assertive region", () => {
    announce("Failed", { politeness: "assertive" });
    expect(region("assertive")).toHaveTextContent("Failed");
    expect(region("assertive")).toHaveAttribute("aria-live", "assertive");
  });

  it("speaks through a mounted <Announcer /> while it is mounted", () => {
    const { container, unmount } = render(
      <div data-testid="modal">
        <Announcer />
      </div>,
    );
    announce("In the dialog");
    expect(region("polite", container)).toHaveTextContent("In the dialog");
    unmount();
    announce("After");
    expect(region("polite")).toHaveTextContent("After");
    expect(region("polite")!.parentElement).toBe(document.body);
  });
});
