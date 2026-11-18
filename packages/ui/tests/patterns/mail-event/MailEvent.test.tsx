import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MailEvent } from "../../../src/patterns/mail-event/MailEvent";

describe("MailEvent", () => {
  it("renders text, tone and time", () => {
    render(
      <ul>
        <MailEvent tone="danger" time="2026-11-17T09:41:00Z">
          Status changed to Closed
        </MailEvent>
      </ul>,
    );
    const item = screen.getByRole("listitem");
    expect(item).toHaveAttribute("data-tone", "danger");
    expect(item).toHaveTextContent("Status changed to Closed");
    expect(item.querySelector("time")).not.toBeNull();
  });
  it("defaults to neutral without time", () => {
    render(
      <ul>
        <MailEvent>Anna assigned this to Bob</MailEvent>
      </ul>,
    );
    expect(screen.getByRole("listitem")).toHaveAttribute("data-tone", "neutral");
    expect(screen.getByRole("listitem").querySelector("time")).toBeNull();
  });
});
