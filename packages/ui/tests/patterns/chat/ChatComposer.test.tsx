import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ChatComposer,
  ChatComposerInput,
  ChatSendButton,
} from "../../../src/patterns/chat/ChatComposer";

describe("ChatComposer", () => {
  it("renders children, extras and action", () => {
    render(
      <ChatComposer extras={<span>extra</span>} action={<span>action</span>}>
        <span>the input</span>
      </ChatComposer>,
    );
    expect(screen.getByText("the input")).toBeInTheDocument();
    expect(screen.getByText("extra")).toBeInTheDocument();
    expect(screen.getByText("action")).toBeInTheDocument();
  });

  it("adds the dashed border classes when dragging", () => {
    const { container } = render(
      <ChatComposer dragging>
        <span>input</span>
      </ChatComposer>,
    );
    const shell = container.querySelector('[data-slot="chat-composer"]');
    expect(shell).toHaveClass("border-dashed", "border-ring");
    expect(shell).toHaveAttribute("data-dragging", "");
  });

  it("sets the --chat-composer-radius custom property from radius", () => {
    const { container } = render(
      <ChatComposer radius="2rem">
        <span>input</span>
      </ChatComposer>,
    );
    const shell = container.querySelector('[data-slot="chat-composer"]') as HTMLElement;
    expect(shell.style.getPropertyValue("--chat-composer-radius")).toBe("2rem");
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ChatComposer ref={ref}>
        <span>input</span>
      </ChatComposer>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute("data-slot", "chat-composer");
  });

  it("merges a custom className", () => {
    const { container } = render(
      <ChatComposer className="my-extra-class">
        <span>input</span>
      </ChatComposer>,
    );
    expect(container.querySelector('[data-slot="chat-composer"]')).toHaveClass("my-extra-class");
  });

  it("dims and disables pointer events on the action row when disabled", () => {
    const { container } = render(
      <ChatComposer disabled>
        <span>input</span>
      </ChatComposer>,
    );
    expect(container.querySelector('[data-slot="chat-composer-actions"]')).toHaveClass(
      "pointer-events-none",
      "opacity-50",
    );
  });
});

describe("ChatComposerInput", () => {
  it("calls onSubmit and does not insert a newline on Enter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChatComposerInput onSubmit={onSubmit} defaultValue="hello" />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    textarea.focus();
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(textarea.value).toBe("hello");
  });

  it("does not call onSubmit on Shift+Enter", async () => {
    const onSubmit = vi.fn();
    render(<ChatComposerInput onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sets enterKeyHint to send", () => {
    render(<ChatComposerInput />);
    expect(screen.getByRole("textbox")).toHaveAttribute("enterKeyHint", "send");
  });

  it("does not throw while growing as the user types (jsdom reports scrollHeight 0)", async () => {
    const user = userEvent.setup();
    render(<ChatComposerInput />);
    const textarea = screen.getByRole("textbox");
    await expect(user.type(textarea, "some longer text that would normally grow the box")).resolves.not.toThrow();
  });

  it("forwards the ref to the textarea element", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<ChatComposerInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});

describe("ChatSendButton", () => {
  it('state="send" has aria-label "Send"', () => {
    render(<ChatSendButton />);
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it('state="stop" has aria-label "Stop"', () => {
    render(<ChatSendButton state="stop" />);
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("custom labels win over the defaults", () => {
    render(<ChatSendButton labels={{ send: "Go" }} />);
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });

  it("fires onClick", () => {
    const onClick = vi.fn();
    render(<ChatSendButton onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
