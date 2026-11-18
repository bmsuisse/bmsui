import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConversationList, ConversationRow } from "../../../src/patterns/conversation-row/ConversationRow";

const base = {
  subject: "Offerte 2026-0412",
  preview: "Guten Tag, anbei die Offerte",
  customer: { name: "Keller Haustechnik AG" },
  time: "2026-11-10T08:00:00Z",
};

describe("ConversationRow", () => {
  it("renders inside a list with subject, preview and customer", () => {
    render(
      <ConversationList aria-label="Inbox">
        <ConversationRow {...base} />
      </ConversationList>,
    );
    expect(screen.getByRole("list", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.getByText("Offerte 2026-0412")).toBeInTheDocument();
    expect(screen.getByText("Keller Haustechnik AG")).toBeInTheDocument();
    expect(screen.getByRole("listitem").querySelector("time")).not.toBeNull();
  });

  it("makes the subject a link with href", () => {
    render(<ul><ConversationRow {...base} href="/c/1" /></ul>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/c/1");
  });

  it("makes the subject a button with onClick", () => {
    const onClick = vi.fn();
    render(<ul><ConversationRow {...base} onClick={onClick} /></ul>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("shows state icons with accessible text and status label", () => {
    render(
      <ul>
        <ConversationRow {...base} unread starred hasAttachments threadCount={4} status="pending" assignee={{ name: "Anna Muster" }} />
      </ul>,
    );
    expect(screen.getByText("Unread")).toBeInTheDocument();
    expect(screen.getByText("Starred")).toBeInTheDocument();
    expect(screen.getByText("Has attachments")).toBeInTheDocument();
    expect(screen.getByLabelText("4 messages")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Anna Muster/).length).toBeGreaterThan(0);
  });

  it("shows a checkbox only with onSelectedChange, and tags stay clickable", () => {
    const onSelectedChange = vi.fn();
    const onTag = vi.fn();
    const { rerender } = render(<ul><ConversationRow {...base} href="/x" /></ul>);
    expect(screen.queryByRole("checkbox")).toBeNull();
    rerender(
      <ul>
        <ConversationRow
          {...base}
          href="/x"
          selected={false}
          onSelectedChange={onSelectedChange}
          tags={<button onClick={onTag}>VIP</button>}
        />
      </ul>,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Offerte 2026-0412" }));
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "VIP" }));
    expect(onTag).toHaveBeenCalled();
  });

  it("accepts translated labels", () => {
    render(
      <ul>
        <ConversationRow {...base} unread status="closed" labels={{ unread: "Ungelesen", status: { closed: "Geschlossen" } }} />
      </ul>,
    );
    expect(screen.getByText("Ungelesen")).toBeInTheDocument();
    expect(screen.getByText("Geschlossen")).toBeInTheDocument();
  });
});
