import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatConversation } from "../../../src/patterns/chat-conversation/ChatConversation";

/** jsdom has no layout: fake the geometry the component reads. */
function geometry(el: HTMLElement, { scrollHeight, clientHeight }: { scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
}

describe("ChatConversation", () => {
  it("is a polite log with an accessible name", () => {
    render(<ChatConversation>content</ChatConversation>);
    const log = screen.getByRole("log", { name: "Conversation" });
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveAttribute("tabindex", "0");
  });

  it("renders the empty slot only without children", () => {
    const { rerender } = render(<ChatConversation empty={<p>Nothing yet</p>} />);
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
    rerender(<ChatConversation empty={<p>Nothing yet</p>}><p>msg</p></ChatConversation>);
    expect(screen.queryByText("Nothing yet")).toBeNull();
  });

  it("shows Jump to latest when scrolled up and scrolls back down on click", async () => {
    render(<ChatConversation><p>msg</p></ChatConversation>);
    const log = screen.getByRole("log");
    geometry(log, { scrollHeight: 1000, clientHeight: 200 });
    expect(screen.queryByRole("button", { name: "Jump to latest" })).toBeNull();
    log.scrollTop = 100;
    fireEvent.scroll(log);
    const button = screen.getByRole("button", { name: "Jump to latest" });
    await userEvent.click(button);
    expect(log.scrollTop).toBe(1000);
  });

  it("hides the button again at the bottom", () => {
    render(<ChatConversation><p>msg</p></ChatConversation>);
    const log = screen.getByRole("log");
    geometry(log, { scrollHeight: 1000, clientHeight: 200 });
    log.scrollTop = 100;
    fireEvent.scroll(log);
    expect(screen.getByRole("button", { name: "Jump to latest" })).toBeInTheDocument();
    log.scrollTop = 800;
    fireEvent.scroll(log);
    expect(screen.queryByRole("button", { name: "Jump to latest" })).toBeNull();
  });

  it("calls onReachTop once per arrival at the top", () => {
    const onReachTop = vi.fn();
    render(<ChatConversation onReachTop={onReachTop}><p>msg</p></ChatConversation>);
    const log = screen.getByRole("log");
    geometry(log, { scrollHeight: 1000, clientHeight: 200 });
    log.scrollTop = 0;
    fireEvent.scroll(log);
    fireEvent.scroll(log);
    expect(onReachTop).toHaveBeenCalledTimes(1);
    log.scrollTop = 300;
    fireEvent.scroll(log);
    log.scrollTop = 0;
    act(() => {
      fireEvent.scroll(log);
    });
    expect(onReachTop).toHaveBeenCalledTimes(2);
  });

  it("shows a history spinner", () => {
    render(<ChatConversation loadingHistory><p>msg</p></ChatConversation>);
    expect(screen.getByText("Loading earlier messages…")).toBeInTheDocument();
  });
});
