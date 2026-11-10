import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Avatar, AvatarGroup, avatarColorIndex, getInitials } from "../../../src/patterns/avatar/Avatar";

describe("getInitials / avatarColorIndex", () => {
  it("derives initials from names and emails", () => {
    expect(getInitials("Anna Muster")).toBe("AM");
    expect(getInitials("anna.maria.muster@bms.ch")).toBe("AM");
    expect(getInitials("Ölwerk")).toBe("Ö");
    expect(getInitials("  ")).toBe("?");
  });

  it("is deterministic and case-insensitive", () => {
    expect(avatarColorIndex("Anna Muster")).toBe(avatarColorIndex("anna muster"));
    expect(avatarColorIndex("Anna Muster")).toBeGreaterThanOrEqual(0);
  });
});

describe("Avatar", () => {
  it("shows initials with an accessible name", () => {
    render(<Avatar name="Anna Muster" />);
    const avatar = screen.getByRole("img", { name: "Anna Muster" });
    expect(avatar).toHaveTextContent("AM");
  });

  it("swaps to the image once loaded and back to initials on error", () => {
    const { container, rerender } = render(<Avatar name="Anna Muster" src="/a.png" />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(screen.getByTestId("avatar")).toHaveTextContent("AM");
    fireEvent.load(img);
    expect(screen.getByTestId("avatar")).not.toHaveTextContent("AM");
    rerender(<Avatar name="Anna Muster" src="/broken.png" />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("avatar")).toHaveTextContent("AM");
  });

  it("shows an image that already finished loading before mount/hydration (no load event)", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(64);
    try {
      const { container } = render(<Avatar name="Anna Muster" src="/anna.png" />);
      const img = container.querySelector("img") as HTMLImageElement;
      expect(img.className).toContain("opacity-100");
      expect(screen.getByTestId("avatar")).not.toHaveTextContent("AM");
    } finally {
      complete.mockRestore();
      width.mockRestore();
    }
  });

  it("renders a status dot and folds its label into the name; decorative hides it", () => {
    const { rerender } = render(<Avatar name="Anna" status="success" statusLabel="online" size="lg" />);
    expect(screen.getByRole("img", { name: "Anna, online" })).toBeInTheDocument();
    expect(screen.getByTestId("avatar-status").className).toContain("bg-emerald-500");
    rerender(<Avatar name="Anna" decorative />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByTestId("avatar")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("AvatarGroup", () => {
  const people = ["Anna Muster", "Ben Keller", "Carla Rossi", "Dario Frei", "Eva Graf", "Fabio Huber"].map((name) => ({ name }));

  it("shows max avatars and a +N chip naming the rest", () => {
    render(<AvatarGroup items={people} max={3} />);
    expect(screen.getAllByTestId("avatar")).toHaveLength(3);
    const overflow = screen.getByTestId("avatar-group-overflow");
    expect(overflow).toHaveTextContent("+3");
    expect(overflow).toHaveAttribute("aria-label", "3 more: Dario Frei, Eva Graf, Fabio Huber");
    expect(screen.getByRole("group")).toHaveAttribute("aria-label", people.map((p) => p.name).join(", "));
  });

  it("shows the last avatar instead of a +1 chip", () => {
    render(<AvatarGroup items={people.slice(0, 4)} max={3} />);
    expect(screen.getAllByTestId("avatar")).toHaveLength(4);
    expect(screen.queryByTestId("avatar-group-overflow")).toBeNull();
  });

  it("translates the overflow label", () => {
    render(<AvatarGroup items={people} max={2} labels={{ more: (n) => `${n} weitere` }} />);
    expect(screen.getByTestId("avatar-group-overflow").getAttribute("aria-label")).toMatch(/^4 weitere:/);
  });
});
