import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatMessage } from "../../../src/patterns/chat-message/ChatMessage";

describe("ChatMessage", () => {
  it("renders role, name and content", () => {
    render(
      <ChatMessage role="assistant" name="Helper" avatar>
        Hello there
      </ChatMessage>,
    );
    const article = screen.getByRole("article", { name: "Helper" });
    expect(article).toHaveAttribute("data-role", "assistant");
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("labels a user message with the default role label", () => {
    render(<ChatMessage role="user">Hi</ChatMessage>);
    expect(screen.getByRole("article", { name: "You" })).toBeInTheDocument();
  });

  it("renders a Date as a time element", () => {
    const { container } = render(
      <ChatMessage role="assistant" time={new Date("2026-11-17T09:41:00")}>
        x
      </ChatMessage>,
    );
    expect(container.querySelector("time")).not.toBeNull();
  });

  it("shows a non-date string time as given", () => {
    render(<ChatMessage role="assistant" time="Just now">x</ChatMessage>);
    expect(screen.getByText("Just now")).toBeInTheDocument();
  });

  it("marks streaming as busy with screen-reader text", () => {
    render(<ChatMessage role="assistant" status="streaming">partial</ChatMessage>);
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Writing a reply")).toBeInTheDocument();
  });

  it("shows sending text", () => {
    render(<ChatMessage role="user" status="sending">x</ChatMessage>);
    expect(screen.getByText("Sending…")).toBeInTheDocument();
  });

  it("shows the error with a working retry", async () => {
    const onRetry = vi.fn();
    render(<ChatMessage role="user" status="error" onRetry={onRetry}>x</ChatMessage>);
    expect(screen.getByRole("alert")).toHaveTextContent("This message could not be sent.");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders actions and a system note", () => {
    const { rerender } = render(
      <ChatMessage role="assistant" actions={<button type="button">Copy</button>}>x</ChatMessage>,
    );
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    rerender(<ChatMessage role="system">Moved</ChatMessage>);
    expect(screen.getByRole("article")).toHaveAttribute("data-role", "system");
  });
});
