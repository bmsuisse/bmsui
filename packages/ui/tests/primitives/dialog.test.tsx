import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../src/primitives/dialog";

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
});
