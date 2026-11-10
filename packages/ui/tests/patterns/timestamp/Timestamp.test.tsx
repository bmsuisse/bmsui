import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "../../../src/patterns/timestamp/formatRelativeTime";
import { Timestamp } from "../../../src/patterns/timestamp/Timestamp";

const NOW = new Date("2026-11-10T12:00:00Z");

describe("formatRelativeTime", () => {
  it("uses the largest whole unit in the locale's wording", () => {
    const at = (s: number) => new Date(NOW.getTime() - s * 1000);
    expect(formatRelativeTime(at(3), NOW, "de-CH")).toBe("jetzt");
    expect(formatRelativeTime(at(5 * 60), NOW, "de-CH")).toBe("vor 5 Min.");
    expect(formatRelativeTime(at(3 * 3600), NOW, "de-CH", "long")).toBe("vor 3 Stunden");
    expect(formatRelativeTime(at(86400), NOW, "de-CH")).toBe("gestern");
    expect(formatRelativeTime(at(-2 * 86400), NOW, "en-US", "long")).toBe("in 2 days");
    expect(formatRelativeTime(at(-20), NOW, "en-US", "long")).toBe("now");
  });
});

describe("Timestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date", "setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders relative text in a <time> with an ISO dateTime, de-CH by default", () => {
    const value = new Date(NOW.getTime() - 5 * 60_000);
    render(<Timestamp value={value} />);
    const time = screen.getByTestId("timestamp");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", value.toISOString());
    expect(time).toHaveTextContent("vor 5 Min.");
    const full = new Intl.DateTimeFormat("de-CH", { dateStyle: "full", timeStyle: "medium" }).format(value);
    expect(time).toHaveAttribute("aria-label", `vor 5 Min. (${full})`);
    expect(time).toHaveAttribute("tabindex", "0");
  });

  it("refreshes live as time passes, and stops when live is off", () => {
    const value = new Date(NOW.getTime() - 50_000).toISOString();
    const { rerender } = render(<Timestamp value={value} locale="en-US" relativeStyle="long" />);
    expect(screen.getByTestId("timestamp")).toHaveTextContent("50 seconds ago");
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(screen.getByTestId("timestamp")).toHaveTextContent("1 minute ago");
    rerender(<Timestamp value={value} locale="en-US" relativeStyle="long" live={false} />);
    const before = screen.getByTestId("timestamp").textContent;
    act(() => {
      vi.advanceTimersByTime(10 * 60_000);
    });
    expect(screen.getByTestId("timestamp").textContent).toBe(before);
  });

  it("formats absolute values without a tooltip by default", () => {
    const value = Date.UTC(2026, 2, 3, 8, 7);
    const expected = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("de-CH", o).format(value);
    const { rerender } = render(<Timestamp value={value} format="date" />);
    expect(screen.getByTestId("timestamp")).toHaveTextContent(expected({ day: "2-digit", month: "2-digit", year: "numeric" }));
    expect(screen.getByTestId("timestamp")).not.toHaveAttribute("tabindex");
    rerender(<Timestamp value={value} format="time" />);
    expect(screen.getByTestId("timestamp")).toHaveTextContent(expected({ hour: "2-digit", minute: "2-digit" }));
    rerender(<Timestamp value={value} format="datetime" />);
    expect(screen.getByTestId("timestamp").textContent).toContain("2026");
  });

  it("shows the full date in a tooltip on focus", async () => {
    vi.useRealTimers();
    const value = new Date(Date.now() - 2 * 3600_000);
    render(<Timestamp value={value} locale="en-US" />);
    fireEvent.focus(screen.getByTestId("timestamp"));
    const tip = await screen.findAllByText(
      new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "medium" }).format(value),
    );
    expect(tip.length).toBeGreaterThan(0);
  });

  it("renders the invalid label for an unparseable value", () => {
    render(<Timestamp value="not a date" invalidLabel="unbekannt" />);
    expect(screen.getByTestId("timestamp")).toHaveTextContent("unbekannt");
  });
});
