import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tabs, TabsList, TabsTrigger } from "../../src/primitives/tabs";

afterEach(() => vi.restoreAllMocks());

describe("Tabs chips variant", () => {
  it("renders separate chips, the active one inverted, in a sideways-scrolling row", () => {
    render(
      <Tabs defaultValue="a" variant="chips">
        <TabsList aria-label="Lanes">
          <TabsTrigger value="a">All</TabsTrigger>
          <TabsTrigger value="b">Open</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByRole("tablist")).toHaveAttribute("data-variant", "chips");
    expect(screen.getByRole("tablist").className).toContain("overflow-x-auto");
    const active = screen.getByRole("tab", { name: "All" });
    expect(active).toHaveAttribute("data-state", "active");
    expect(active.className).toContain("rounded-full");
    expect(active.className).toContain("data-[state=active]:bg-foreground");
  });

  it("styles the count badge by variant and tone", () => {
    render(
      <Tabs defaultValue="a" variant="chips">
        <TabsList>
          <TabsTrigger value="a" count={2}>
            Tasks
          </TabsTrigger>
          <TabsTrigger value="b" count={5} countTone="danger">
            Overdue
          </TabsTrigger>
          <TabsTrigger value="c" count={1} countTone="warning">
            Risks
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const badge = (name: string): Element | null => screen.getByRole("tab", { name: new RegExp(name) }).querySelector('[data-slot="tab-count"]');
    expect(badge("Tasks")?.className).toContain("bg-muted-foreground/20");
    expect(badge("Overdue")?.className).toContain("text-destructive");
    expect(badge("Risks")?.className).toContain("amber");
  });
});

describe("TabsList keeps the active tab in view", () => {
  function setScrollable(list: HTMLElement): ReturnType<typeof vi.fn> {
    Object.defineProperty(list, "scrollWidth", { configurable: true, value: 900 });
    Object.defineProperty(list, "clientWidth", { configurable: true, value: 300 });
    const scrollTo = vi.fn();
    list.scrollTo = scrollTo as unknown as typeof list.scrollTo;
    return scrollTo;
  }

  function List({ value }: { value: string }) {
    return (
      <Tabs value={value} variant="underline">
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
      </Tabs>
    );
  }

  it("scrolls the row (not the page) when the value changes and the row overflows", () => {
    const { rerender } = render(<List value="a" />);
    const scrollTo = setScrollable(screen.getByRole("tablist"));
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    rerender(<List value="c" />);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("does nothing when everything fits", () => {
    const { rerender } = render(<List value="a" />);
    const list = screen.getByRole("tablist");
    const scrollTo = vi.fn();
    list.scrollTo = scrollTo as unknown as typeof list.scrollTo;
    rerender(<List value="b" />);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
