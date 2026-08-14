import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../src/primitives/tooltip";

describe("Tooltip", () => {
  it("renders trigger without showing content up front", () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Helpful hint</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(screen.getByText("Hover me")).toBeInTheDocument();
    expect(screen.queryByText("Helpful hint")).not.toBeInTheDocument();
  });

  it("shows the tooltip content on hover and links it via aria-describedby", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Helpful hint</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText("Hover me");
    await user.hover(trigger);

    const content = await waitFor(() => screen.getByText("Helpful hint"), { timeout: 3000 });
    expect(content).toBeInTheDocument();

    const describedBy = trigger.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")).toContainElement(content);
  });

  it("shows the tooltip content on focus", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Helpful hint</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    await user.tab();
    expect(screen.getByText("Hover me")).toHaveFocus();

    const content = await waitFor(() => screen.getByText("Helpful hint"), { timeout: 3000 });
    expect(content).toBeInTheDocument();
  });
});
