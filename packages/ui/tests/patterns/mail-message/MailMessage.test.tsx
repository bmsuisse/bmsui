import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MailMessage } from "../../../src/patterns/mail-message/MailMessage";

const base = {
  sender: { name: "Anna Keller", email: "anna@keller.ch" },
  time: "2026-11-17T09:41:00Z",
};

describe("MailMessage", () => {
  it("renders sender, subject, body, recipients", () => {
    render(
      <MailMessage direction="inbound" {...base} subject="Offerte 2026-0412" recipients={{ to: ["verkauf@muster-ag.ch"], cc: ["x@y.ch"] }}>
        Guten Tag
      </MailMessage>,
    );
    expect(screen.getByRole("article", { name: "Anna Keller" })).toHaveAttribute("data-direction", "inbound");
    expect(screen.getByText("Offerte 2026-0412")).toBeInTheDocument();
    expect(screen.getByText("Guten Tag")).toBeInTheDocument();
    expect(screen.getByText(/to: verkauf@muster-ag.ch/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show all recipients" })).toBeNull();
  });
  it("collapses a long recipient line", () => {
    render(
      <MailMessage direction="outbound" {...base} recipients={{ to: ["a@a.ch", "b@a.ch", "c@a.ch", "d@a.ch"] }}>
        x
      </MailMessage>,
    );
    const btn = screen.getByRole("button", { name: "Show all recipients" });
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Hide recipients" })).toHaveAttribute("aria-expanded", "true");
  });
  it("shows draft marker and failed state with retry", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <MailMessage direction="outbound" {...base} status="draft">
        x
      </MailMessage>,
    );
    expect(screen.getByText("[Draft]")).toBeInTheDocument();
    rerender(
      <MailMessage direction="outbound" {...base} status="failed" error="SMTP 550" onRetry={onRetry}>
        x
      </MailMessage>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Sending failed: SMTP 550");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
  it("renders attachments, folded quote and actions; note label", () => {
    render(
      <MailMessage
        direction="note"
        {...base}
        attachments={[{ id: "1", name: "a.pdf", size: 2048 }]}
        quoted="Am 14.11. schrieb Bob"
        actions={<button type="button">Reply</button>}
      >
        x
      </MailMessage>,
    );
    expect(screen.getByText("Note")).toBeInTheDocument();
    expect(screen.getByText("a.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show quoted text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reply" })).toBeInTheDocument();
  });
});
