import { describe, expect, it } from "vitest";
import { addDays, addMonths, monthGrid, weekdayNames, weekStartOf } from "../../src/lib/calendar";

describe("calendar helpers", () => {
  it("does ISO-day arithmetic across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-03-31", -1)).toBe("2024-02-29");
    expect(addMonths("2026-11-10", -12)).toBe("2025-11-10");
  });

  it("knows the locale's week start", () => {
    expect(weekStartOf("de-CH")).toBe(1);
    expect(weekStartOf("en-US")).toBe(0);
    expect(weekStartOf("en-GB")).toBe(1);
  });

  it("builds six full weeks starting on the week start", () => {
    const monday = monthGrid("2026-11-10", 1);
    expect(monday).toHaveLength(6);
    expect(monday[0]?.[0]).toBe("2026-10-26");
    expect(monday[5]?.[6]).toBe("2026-12-06");
    const sunday = monthGrid("2026-11-10", 0);
    expect(sunday[0]?.[0]).toBe("2026-11-01");
  });

  it("names weekdays in week order", () => {
    expect(weekdayNames("de-CH", 1)[0]).toBe("Mo");
    expect(weekdayNames("en-US", 0)[0]).toBe("Sun");
  });
});
