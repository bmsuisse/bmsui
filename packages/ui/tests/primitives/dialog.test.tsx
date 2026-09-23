import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../src/primitives/dialog";

describe("DialogHeader / DialogFooter sticky positioning", () => {
  it("DialogHeader sticks to the top of DialogContent's scroll area", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader data-testid="header">
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <p>Body</p>
        </DialogContent>
      </Dialog>,
    );

    const header = screen.getByTestId("header");
    expect(header.className).toContain("sticky");
    expect(header.className).toContain("-top-6");
    expect(header.className).toContain("bg-background");
  });

  it("DialogFooter sticks to the bottom of DialogContent's scroll area", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <p>Body</p>
          <DialogFooter data-testid="footer">
            <button type="button">OK</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const footer = screen.getByTestId("footer");
    expect(footer.className).toContain("sticky");
    expect(footer.className).toContain("-bottom-6");
    expect(footer.className).toContain("bg-background");
  });

  it("a caller's own className still merges onto the sticky base classes", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader data-testid="header" className="border-b">
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    const header = screen.getByTestId("header");
    expect(header.className).toContain("sticky");
    expect(header.className).toContain("border-b");
  });

  it("the sticky close button wrapper doesn't stretch the close button to its own zero height", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent closeButtonTestId="close">
          <p>Body</p>
        </DialogContent>
      </Dialog>,
    );

    const closeButton = screen.getByTestId("close");
    // The wrapper is `h-0` (zero footprint, so it doesn't push content down) --
    // it must also set `items-start` so flexbox's default `align-items: stretch`
    // doesn't shrink the button itself to that same zero height (a real
    // clickable-area regression jsdom's own getBoundingClientRect can't catch,
    // since jsdom never computes real layout -- this only guards the class).
    const wrapper = closeButton.parentElement;
    expect(wrapper?.className).toContain("h-0");
    expect(wrapper?.className).toContain("items-start");
    expect(wrapper?.className).toContain("sticky");
  });
});
