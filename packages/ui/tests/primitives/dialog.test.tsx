import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../src/primitives/dialog";
import { ConfirmDialog } from "../../src/patterns/modal/ConfirmDialog";

describe("DialogContent / DialogBody layout", () => {
  it("DialogContent is a flex column, not a single scrolling box", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent data-testid="content">
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogBody data-testid="body">Body</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    const content = screen.getByTestId("content");
    expect(content.className).toContain("flex");
    expect(content.className).toContain("flex-col");
    expect(content.className).not.toContain("overflow-y-auto");
  });

  it("DialogBody, not DialogContent, is the one scrolling region", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogBody data-testid="body">Body</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    const body = screen.getByTestId("body");
    expect(body.className).toContain("overflow-y-auto");
    expect(body.className).toContain("flex-1");
    // min-h-0 overrides flexbox's default `min-height: auto`, which would
    // otherwise refuse to shrink DialogBody below its content's natural
    // height and silently defeat overflow-y-auto.
    expect(body.className).toContain("min-h-0");
  });

  it("DialogHeader and DialogFooter don't grow/shrink -- only DialogBody does", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader data-testid="header">
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogBody>Body</DialogBody>
          <DialogFooter data-testid="footer">
            <button type="button">OK</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByTestId("header").className).toContain("shrink-0");
    expect(screen.getByTestId("footer").className).toContain("shrink-0");
  });

  it("a caller's own className still merges onto DialogBody's base classes", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogBody data-testid="body" className="bg-muted">
            Body
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );

    const body = screen.getByTestId("body");
    expect(body.className).toContain("overflow-y-auto");
    expect(body.className).toContain("bg-muted");
  });

  it("renders the close button as a plain absolute child again (no sticky wrapper)", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent closeButtonTestId="close">
          <DialogBody>Body</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    const closeButton = screen.getByTestId("close");
    expect(closeButton.className).toContain("absolute");
    expect(closeButton.parentElement).toHaveAttribute("role", "dialog");
  });

  // https://github.com/bmsuisse/bmsui/issues/70
  it("DialogHeader/DialogFooter are opaque and nothing overlaps DialogBody", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader data-testid="header">
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogBody data-testid="body">Body</DialogBody>
          <DialogFooter data-testid="footer">
            <button type="button">OK</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const header = screen.getByTestId("header");
    const footer = screen.getByTestId("footer");
    expect(header.className).toContain("bg-background");
    expect(footer.className).toContain("bg-background");
    // 0.16.1's footer pulled itself over the body with -mt-6.
    expect(footer.className).not.toMatch(/(^|\s)-m[ty]?-/);
    expect(header).toHaveAttribute("data-slot", "dialog-header");
    expect(screen.getByTestId("body")).toHaveAttribute("data-slot", "dialog-body");
    expect(footer).toHaveAttribute("data-slot", "dialog-footer");
  });

  // https://github.com/bmsuisse/bmsui/issues/71
  it("spaces the title from the first field: header pb-3 + body pt-1, body pb-1 before a footer", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader data-testid="header">
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogBody data-testid="body">Body</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByTestId("header").className).toContain("pb-3");
    const body = screen.getByTestId("body").className;
    expect(body).toContain("pt-1");
    // Own bottom inset when there's no footer, pb-1 when one follows.
    expect(body).toContain("pb-6");
    expect(body).toContain("[&:has(+[data-slot=dialog-footer])]:pb-1");
  });

  it("an empty DialogBody (ConfirmDialog) is hidden instead of adding a gap", () => {
    render(
      <ConfirmDialog open onOpenChange={() => {}} title="Delete?" onConfirm={() => {}} />,
    );

    const body = document.querySelector('[data-slot="dialog-body"]');
    expect(body).toBeEmptyDOMElement();
    expect(body?.className).toContain("empty:hidden");
  });

  it("forwards a ref to DialogBody's div", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogBody ref={ref} data-testid="body">
            Body
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );

    expect(ref.current).toBe(screen.getByTestId("body"));
  });

  it("flags hidden content above/below on DialogBody so header/footer can show a divider", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogBody data-testid="body">Body</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    const body = screen.getByTestId("body");
    // jsdom has no layout: fake a 100px viewport over 300px of content.
    Object.defineProperty(body, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(body, "scrollHeight", { configurable: true, value: 300 });

    body.scrollTop = 0;
    fireEvent.scroll(body);
    expect(body).not.toHaveAttribute("data-overflow-top");
    expect(body).toHaveAttribute("data-overflow-bottom");

    body.scrollTop = 100;
    fireEvent.scroll(body);
    expect(body).toHaveAttribute("data-overflow-top");
    expect(body).toHaveAttribute("data-overflow-bottom");

    body.scrollTop = 200;
    fireEvent.scroll(body);
    expect(body).toHaveAttribute("data-overflow-top");
    expect(body).not.toHaveAttribute("data-overflow-bottom");
  });
});
