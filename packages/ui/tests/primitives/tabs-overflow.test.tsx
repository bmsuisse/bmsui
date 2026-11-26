import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs, TabsList, TabsTrigger } from "../../src/primitives/tabs";

const NAMES = ["a", "b", "c", "d", "e", "f"];

function mockLayout(rowWidth: number): void {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get(this: HTMLElement) {
      if (this.dataset.tabValue) return 100;
      if (this.dataset.testid === "tabs-overflow") return 60;
      return 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.slot === "tabs-overflow-row" ? rowWidth : 0;
    },
  });
}

function Demo({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("a");
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      variant="underline"
      overflow="menu"
    >
      <TabsList aria-label="Sections">
        {NAMES.map((name) => (
          <TabsTrigger key={name} value={name} count={name === "e" ? 3 : undefined}>
            Tab {name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

beforeEach(() => mockLayout(350));
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "offsetWidth");
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  vi.restoreAllMocks();
});

const visibleTabs = (): string[] =>
  screen
    .getAllByRole("tab", { hidden: true })
    .filter((t) => t.getAttribute("aria-hidden") !== "true")
    .map((t) => t.getAttribute("data-tab-value") ?? "");

describe("Tabs overflow=menu", () => {
  it("keeps what fits in the row, hides the rest from the tab order and offers a More button", () => {
    render(<Demo />);
    expect(visibleTabs()).toEqual(["a", "b"]);
    const hidden = screen.getAllByRole("tab", { hidden: true }).filter((t) => t.getAttribute("aria-hidden") === "true");
    expect(hidden.map((t) => t.getAttribute("data-tab-value"))).toEqual(["c", "d", "e", "f"]);
    for (const tab of hidden) {
      expect(tab).toHaveAttribute("aria-disabled", "true");
      expect(tab).toHaveAttribute("tabindex", "-1");
    }
    expect(screen.getByTestId("tabs-overflow")).not.toHaveAttribute("aria-hidden");
  });

  it("lists the hidden tabs in the menu; picking one selects it and moves it into the row", async () => {
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    await userEvent.click(screen.getByTestId("tabs-overflow"));
    const items = await screen.findAllByRole("menuitem");
    expect(items.map((i) => i.getAttribute("data-tab-menu-value"))).toEqual(["c", "d", "e", "f"]);
    expect(within(items[2] as HTMLElement).getByText("3")).toBeInTheDocument();

    await userEvent.click(items[2] as HTMLElement);
    expect(onChange).toHaveBeenCalledWith("e");
    // Most recently used first: e takes the place of b; the row stays in declaration order.
    expect(visibleTabs()).toEqual(["a", "e"]);
    expect(screen.getByRole("tab", { name: /Tab e/ })).toHaveAttribute("aria-selected", "true");
  });

  it("shows no menu when everything fits", () => {
    mockLayout(1000);
    render(<Demo />);
    expect(visibleTabs()).toEqual(NAMES);
    expect(screen.getByTestId("tabs-overflow")).toHaveAttribute("aria-hidden", "true");
  });

  it("the active tab keeps a slot even when it alone does not fit", () => {
    mockLayout(90);
    render(<Demo />);
    expect(visibleTabs()).toEqual(["a"]);
  });

  it("the default (scroll) renders no menu", () => {
    render(
      <Tabs defaultValue="a" variant="underline">
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.queryByTestId("tabs-overflow")).not.toBeInTheDocument();
  });
});
