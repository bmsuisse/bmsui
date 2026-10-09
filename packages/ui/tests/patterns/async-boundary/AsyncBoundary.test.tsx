import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AsyncBoundary } from "../../../src/patterns/async-boundary/AsyncBoundary";

describe("AsyncBoundary", () => {
  it("first load shows the skeleton, not children, with no other props", () => {
    render(
      <AsyncBoundary loading>
        <p>data</p>
      </AsyncBoundary>,
    );
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.queryByText("data")).not.toBeInTheDocument();
  });

  it("error without data shows ErrorState", () => {
    render(
      <AsyncBoundary error="fail">
        <p>data</p>
      </AsyncBoundary>,
    );
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("error with stale data keeps children and shows a banner", () => {
    render(
      <AsyncBoundary error="fail" hasData>
        <p>data</p>
      </AsyncBoundary>,
    );
    expect(screen.getByText("data")).toBeInTheDocument();
    expect(screen.getByTestId("inline-error")).toBeInTheDocument();
  });

  it("refetch keeps children with a refresh bar", () => {
    render(
      <AsyncBoundary loading hasData>
        <p>data</p>
      </AsyncBoundary>,
    );
    expect(screen.getByText("data")).toBeInTheDocument();
    expect(screen.getByTestId("refresh-bar")).toBeInTheDocument();
  });

  it("empty and idle shows emptyContent", () => {
    render(
      <AsyncBoundary empty emptyContent={<p>nothing</p>}>
        <p>data</p>
      </AsyncBoundary>,
    );
    expect(screen.getByText("nothing")).toBeInTheDocument();
  });
});
