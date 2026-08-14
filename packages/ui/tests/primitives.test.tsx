import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Label,
  Skeleton,
} from "../src/index";

describe("Button", () => {
  it("fires onClick and respects disabled", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Click me" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Click me" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies the secondary variant classes", () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button", { name: "Secondary" }).className).toContain("bg-muted");
  });

  it("applies the link variant classes", () => {
    render(<Button variant="link">Link</Button>);
    expect(screen.getByRole("button", { name: "Link" }).className).toContain(
      "underline-offset-4",
    );
  });

  it("applies the xs size classes", () => {
    render(<Button size="xs">Tiny</Button>);
    expect(screen.getByRole("button", { name: "Tiny" }).className).toContain("h-7");
  });

  it("auto-sizes an unstyled svg child via the [&_svg] utility classes", () => {
    render(
      <Button>
        <svg data-testid="icon" />
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" }).className).toContain("[&_svg]:size-4");
  });
});

describe("Input + Label", () => {
  it("associates a label with its input via htmlFor/id", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" />
      </>,
    );
    expect(screen.getByLabelText("Email")).toBeInstanceOf(HTMLInputElement);
  });

  it("forwards a ref to the underlying input element", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("applies min-w-0 so it can shrink inside a flex row", () => {
    render(<Input data-testid="x" />);
    expect(screen.getByTestId("x").className).toContain("min-w-0");
  });
});

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies the warning variant classes", () => {
    render(<Badge variant="warning">Pending</Badge>);
    expect(screen.getByText("Pending").className).toContain("bg-amber-100");
  });
});

describe("Card", () => {
  it("renders composed subcomponents", () => {
    render(
      <Card>
        <CardContent>Hello</CardContent>
      </Card>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});

describe("Skeleton", () => {
  it("renders a placeholder element", () => {
    const { container } = render(<Skeleton data-testid="sk" />);
    expect(container.querySelector('[data-testid="sk"]')).toBeInTheDocument();
  });
});

describe("DialogContent", () => {
  it("renders the close button by default", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("omits the close button when showCloseButton is false", () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
});
