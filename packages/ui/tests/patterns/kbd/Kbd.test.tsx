import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formatKey, Kbd, KeyCombo } from "../../../src/patterns/kbd/Kbd";
import { ShortcutSheet } from "../../../src/patterns/kbd/ShortcutSheet";

const caps = (root: HTMLElement) => within(root).getAllByTestId("kbd").map((k) => k.textContent);

describe("formatKey", () => {
  it("spells modifiers per platform", () => {
    expect(formatKey("Mod", true)).toBe("⌘");
    expect(formatKey("Mod", false)).toBe("Ctrl");
    expect(formatKey("Shift", true)).toBe("⇧");
    expect(formatKey("Shift", false)).toBe("Shift");
    expect(formatKey("ArrowUp", false)).toBe("↑");
    expect(formatKey("k", false)).toBe("K");
  });
});

describe("KeyCombo", () => {
  it("renders one keycap per key: ⌘ K on a Mac, Ctrl K elsewhere", () => {
    const { rerender } = render(<KeyCombo keys="Mod+K" mac />);
    expect(caps(screen.getByTestId("key-combo"))).toEqual(["⌘", "K"]);
    rerender(<KeyCombo keys="Mod+K" mac={false} />);
    expect(caps(screen.getByTestId("key-combo"))).toEqual(["Ctrl", "K"]);
  });

  it("renders sequences with 'then' and alternatives with 'or', translatable", () => {
    render(<KeyCombo keys={["g o", "Mod+Shift+O"]} mac={false} labels={{ then: "dann", or: "oder" }} />);
    const combo = screen.getByTestId("key-combo");
    expect(caps(combo)).toEqual(["G", "O", "Ctrl", "Shift", "O"]);
    expect(combo).toHaveTextContent("dann");
    expect(combo).toHaveTextContent("oder");
  });

  it("renders the PC spelling on the server and switches to ⌘ after hydration on a Mac", async () => {
    const platform = vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    try {
      const html = renderToString(<KeyCombo keys="Mod+K" />);
      expect(html).toContain("Ctrl");
      expect(html).not.toContain("⌘");
      // An explicit `mac` wins on the server too.
      expect(renderToString(<KeyCombo keys="Mod+K" mac />)).toContain("⌘");
      const container = document.createElement("div");
      container.innerHTML = html;
      const recovered = vi.fn();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, <KeyCombo keys="Mod+K" />, { onRecoverableError: recovered });
      });
      expect(recovered).not.toHaveBeenCalled();
      expect(caps(container.querySelector("[data-testid=key-combo]") as HTMLElement)).toEqual(["⌘", "K"]);
      act(() => root?.unmount());
    } finally {
      platform.mockRestore();
    }
  });

  it("Kbd renders a <kbd>", () => {
    render(<Kbd>Esc</Kbd>);
    expect(screen.getByText("Esc").tagName).toBe("KBD");
  });
});

describe("ShortcutSheet", () => {
  it("lists groups and rows and closes via onOpenChange", () => {
    const onOpenChange = vi.fn();
    render(
      <ShortcutSheet
        open
        onOpenChange={onOpenChange}
        mac={false}
        labels={{ title: "Tastaturkürzel" }}
        groups={[
          { title: "General", hint: "Anywhere", items: [{ label: "Search", keys: "Mod+K" }, { label: "Help", keys: "?" }] },
          { title: "Go to", items: [{ label: "Offers", keys: "g o" }] },
        ]}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Tastaturkürzel" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "General" })).toBeInTheDocument();
    expect(screen.getByText("Anywhere")).toBeInTheDocument();
    const rows = screen.getAllByTestId("shortcut-row");
    expect(rows).toHaveLength(3);
    expect(caps(rows[0] as HTMLElement)).toEqual(["Ctrl", "K"]);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
