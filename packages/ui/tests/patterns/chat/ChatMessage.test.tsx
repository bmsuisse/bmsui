import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatMessage, ChatMessageSkeleton } from "../../../src/patterns/chat/ChatMessage";

describe("ChatMessage", () => {
  it("renders children for both roles", () => {
    render(<ChatMessage role="user">hello</ChatMessage>);
    expect(screen.getByText("hello")).toBeInTheDocument();

    render(<ChatMessage role="assistant">world</ChatMessage>);
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  it("user role gets the bubble classes and data-role, assistant does not get a bubble", () => {
    const { container: userContainer } = render(
      <ChatMessage role="user" testId="u">
        hi
      </ChatMessage>,
    );
    expect(screen.getByTestId("u")).toHaveAttribute("data-role", "user");
    const bubble = userContainer.querySelector('[data-slot="chat-message-bubble"]');
    expect(bubble).toBeInTheDocument();
    expect(bubble).toHaveClass("rounded-xl", "bg-muted");

    const { container: assistantContainer } = render(
      <ChatMessage role="assistant" testId="a">
        hi
      </ChatMessage>,
    );
    expect(screen.getByTestId("a")).toHaveAttribute("data-role", "assistant");
    expect(assistantContainer.querySelector('[data-slot="chat-message-bubble"]')).not.toBeInTheDocument();
    expect(assistantContainer.querySelector('[data-slot="chat-message-body"]')).toBeInTheDocument();
  });

  it("renders actions in the footer row", () => {
    render(
      <ChatMessage role="assistant" actions={<button type="button">Copy</button>}>
        body
      </ChatMessage>,
    );
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("renders leading above the body", () => {
    render(
      <ChatMessage role="user" leading={<span>Attachment.pdf</span>}>
        body
      </ChatMessage>,
    );
    expect(screen.getByText("Attachment.pdf")).toBeInTheDocument();
  });

  it("renders error with role=alert", () => {
    render(
      <ChatMessage role="assistant" error="Something went wrong">
        body
      </ChatMessage>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("marker renders an AiMarker for assistant and is ignored for user", () => {
    const { container: assistantContainer } = render(
      <ChatMessage role="assistant" marker>
        body
      </ChatMessage>,
    );
    expect(assistantContainer.querySelector('[data-slot="chat-message-marker"]')).toBeInTheDocument();

    const { container: userContainer } = render(
      <ChatMessage role="user" marker>
        body
      </ChatMessage>,
    );
    expect(userContainer.querySelector('[data-slot="chat-message-marker"]')).not.toBeInTheDocument();
  });

  it("maxBubbleWidth applies to the user bubble", () => {
    const { container } = render(
      <ChatMessage role="user" maxBubbleWidth="60%">
        body
      </ChatMessage>,
    );
    const bubble = container.querySelector('[data-slot="chat-message-bubble"]') as HTMLElement;
    expect(bubble.style.maxWidth).toBe("60%");
  });

  it("forwards ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ChatMessage role="user" ref={ref}>
        body
      </ChatMessage>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute("data-slot", "chat-message");
  });

  it("merges className and spreads arbitrary props", () => {
    render(
      <ChatMessage role="user" className="custom-class" data-foo="bar" testId="m">
        body
      </ChatMessage>,
    );
    const el = screen.getByTestId("m");
    expect(el).toHaveClass("custom-class");
    expect(el).toHaveAttribute("data-foo", "bar");
  });
});

describe("ChatMessageSkeleton", () => {
  it("renders `turns` groups and has role=status", () => {
    const { container } = render(<ChatMessageSkeleton turns={4} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading conversation");
    expect(container.querySelectorAll('[data-slot="chat-message-skeleton-turn"]')).toHaveLength(4);
  });
});
