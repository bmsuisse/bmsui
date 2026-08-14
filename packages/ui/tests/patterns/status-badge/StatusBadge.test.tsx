import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "../../../src/patterns/status-badge/StatusBadge";

describe("StatusBadge", () => {
  it("resolves a known built-in status to its success tone and a title-cased label", () => {
    render(<StatusBadge status="approved" />);
    const badge = screen.getByText("Approved");
    expect(badge.className).toContain("bg-emerald-500/15");
    expect(badge.className).toContain("text-emerald-700");
  });

  it("falls back to the neutral tone for an unknown status", () => {
    render(<StatusBadge status="frobnicated" />);
    const badge = screen.getByText("Frobnicated");
    expect(badge.className).toContain("bg-muted");
    expect(badge.className).toContain("text-muted-foreground");
  });

  it("lets an explicit tone prop override both the built-in map and a caller toneMap", () => {
    render(<StatusBadge status="approved" toneMap={{ approved: "error" }} tone="info" />);
    const badge = screen.getByText("Approved");
    expect(badge.className).toContain("bg-sky-500/15");
    expect(badge.className).not.toContain("bg-emerald-500/15");
    expect(badge.className).not.toContain("bg-destructive/15");
  });

  it("lets a caller toneMap override the built-in default map for a covered status", () => {
    render(<StatusBadge status="approved" toneMap={{ approved: "error" }} />);
    const badge = screen.getByText("Approved");
    expect(badge.className).toContain("bg-destructive/15");
    expect(badge.className).not.toContain("bg-emerald-500/15");
  });

  it("lets a caller toneMap supply a tone for a status not covered by the built-in default map", () => {
    render(<StatusBadge status="shipped" toneMap={{ shipped: "success" }} />);
    const badge = screen.getByText("Shipped");
    expect(badge.className).toContain("bg-emerald-500/15");
  });

  it("lets a custom label override the derived text", () => {
    render(<StatusBadge status="approved" label="All Good" />);
    expect(screen.getByText("All Good")).toBeInTheDocument();
    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
  });

  it("matches status case-insensitively against the built-in map", () => {
    render(<StatusBadge status="APPROVED" />);
    const badge = screen.getByText("Approved");
    expect(badge.className).toContain("bg-emerald-500/15");
  });

  it("matches status case-insensitively against a caller toneMap", () => {
    render(<StatusBadge status="Shipped" toneMap={{ shipped: "warning" }} />);
    const badge = screen.getByText("Shipped");
    expect(badge.className).toContain("bg-amber-500/15");
  });

  it("derives a human-readable label from underscore/hyphen-separated statuses", () => {
    render(<StatusBadge status="in_review" />);
    expect(screen.getByText("In Review")).toBeInTheDocument();
  });
});
