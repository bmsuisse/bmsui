import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApprovalCard } from "../../../src/patterns/approval-card/ApprovalCard";

describe("ApprovalCard", () => {
  it("shows details and calls approve / reject", async () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ApprovalCard title="Send email" description="Review" details={<p>to anna</p>} onApprove={onApprove} onReject={onReject} />,
    );
    expect(screen.getByRole("region", { name: "Send email" })).toBeInTheDocument();
    expect(screen.getByText("to anna")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Needs your approval");
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await userEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(onApprove).toHaveBeenCalled();
    expect(onReject).toHaveBeenCalled();
  });

  it("disables actions while pending", () => {
    render(<ApprovalCard title="t" onApprove={() => undefined} onReject={() => undefined} pending="approve" />);
    expect(screen.getByRole("button", { name: /Working/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
  });

  it("hides actions once decided and shows the result", () => {
    render(<ApprovalCard title="t" status="approved" onApprove={() => undefined} onReject={() => undefined} result="Sent" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Approved");
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });

  it("choice mode calls onChoose and marks the pick", async () => {
    const onChoose = vi.fn();
    const choices = [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta", description: "second" }];
    const { rerender } = render(<ApprovalCard title="Pick" choices={choices} onChoose={onChoose} />);
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Beta/ }));
    expect(onChoose).toHaveBeenCalledWith("b");
    rerender(<ApprovalCard title="Pick" choices={choices} status="approved" selectedChoiceId="b" />);
    expect(screen.getByRole("button", { name: /Beta/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Alpha/ })).toBeDisabled();
  });

  it("uses custom labels", () => {
    render(<ApprovalCard title="t" onApprove={() => undefined} labels={{ approve: "Genehmigen", pending: "Freigabe nötig" }} />);
    expect(screen.getByRole("button", { name: "Genehmigen" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Freigabe nötig");
  });
});
