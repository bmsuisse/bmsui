import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiSuggestion } from "../../../src/patterns/ai/AiSuggestion";

describe("AiSuggestion", () => {
  describe("statuses", () => {
    it("loading: shows a pulsing AiMarker and skeleton lines", () => {
      const { container } = render(
        <AiSuggestion status="loading" testId="s">
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByRole("status")).toBeInTheDocument(); // AiMarker pulse
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
      expect(screen.getByTestId("s")).toHaveAttribute("data-status", "loading");
    });

    it("pending: shows the header, children and the three footer actions", () => {
      render(
        <AiSuggestion status="pending" onAccept={vi.fn()} onEdit={vi.fn()} onReject={vi.fn()} testId="s">
          <span>proposed value</span>
        </AiSuggestion>,
      );
      expect(screen.getByText("proposed value")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    });

    it("accepted: rail/tint gone but a ~60%-opacity AiMarker provenance marker remains", () => {
      const { container } = render(
        <AiSuggestion status="accepted" testId="s">
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByText("AI")).toBeInTheDocument();
      expect(container.querySelector(".opacity-60")).toBeInTheDocument();
      expect(screen.getByTestId("s")).not.toHaveClass("border");
    });

    it("edited: the marker reads 'AI · edited'", () => {
      render(
        <AiSuggestion status="edited" testId="s">
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByText("AI · edited")).toBeInTheDocument();
    });

    it("rejected: shows only the dismissed row and a Restore action", () => {
      render(
        <AiSuggestion status="rejected" onRestore={vi.fn()} testId="s">
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByText("Suggestion dismissed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
      expect(screen.queryByText("value")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    });
  });

  describe("callbacks", () => {
    it("fires onAccept, onEdit, onReject", () => {
      const onAccept = vi.fn();
      const onEdit = vi.fn();
      const onReject = vi.fn();
      render(
        <AiSuggestion status="pending" onAccept={onAccept} onEdit={onEdit} onReject={onReject}>
          <span>value</span>
        </AiSuggestion>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.click(screen.getByRole("button", { name: "Reject" }));
      expect(onAccept).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it("fires onRestore", () => {
      const onRestore = vi.fn();
      render(
        <AiSuggestion status="rejected" onRestore={onRestore}>
          <span>value</span>
        </AiSuggestion>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Restore" }));
      expect(onRestore).toHaveBeenCalledTimes(1);
    });

    it("hides a button when its callback is absent", () => {
      render(
        <AiSuggestion status="pending" onAccept={vi.fn()}>
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    });
  });

  describe("confidence", () => {
    it("renders a ConfidenceIndicator when confidence is given", () => {
      render(
        <AiSuggestion status="pending" confidence={0.9}>
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("feeds the confidence band into the group's accessible name", () => {
      render(
        <AiSuggestion status="pending" confidence={0.9} testId="s">
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByRole("group")).toHaveAccessibleName("AI suggestion, high confidence");
    });

    it("omits the confidence phrase from the accessible name when confidence is absent", () => {
      render(
        <AiSuggestion status="pending" testId="s">
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByRole("group")).toHaveAccessibleName("AI suggestion");
    });
  });

  describe("layout=inline", () => {
    it("renders icon-only action buttons with aria-labels", () => {
      render(
        <AiSuggestion status="pending" layout="inline" onAccept={vi.fn()} onEdit={vi.fn()} onReject={vi.fn()}>
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    });

    it("renders as a single row for the rejected state too", () => {
      render(
        <AiSuggestion status="rejected" layout="inline" onRestore={vi.fn()}>
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByText("Suggestion dismissed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    });
  });

  describe("custom labels", () => {
    it("overrides the default action labels", () => {
      render(
        <AiSuggestion
          status="pending"
          onAccept={vi.fn()}
          onEdit={vi.fn()}
          onReject={vi.fn()}
          labels={{ accept: "Use this", edit: "Adjust", reject: "Ignore" }}
        >
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByRole("button", { name: "Use this" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adjust" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ignore" })).toBeInTheDocument();
    });

    it("overrides the dismissed and restore labels", () => {
      render(
        <AiSuggestion status="rejected" onRestore={vi.fn()} labels={{ dismissed: "Not used", restore: "Bring back" }}>
          <span>value</span>
        </AiSuggestion>,
      );
      expect(screen.getByText("Not used")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bring back" })).toBeInTheDocument();
    });
  });
});
