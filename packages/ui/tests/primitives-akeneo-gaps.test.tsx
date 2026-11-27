import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  ScrollArea,
  Separator,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../src/index";

describe("Button swiss variants", () => {
  it("applies swiss-primary variant classes", () => {
    render(<Button variant="swiss-primary">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" }).className).toContain("bg-swiss-primary");
  });

  it("applies swiss-secondary variant classes", () => {
    render(<Button variant="swiss-secondary">Back</Button>);
    expect(screen.getByRole("button", { name: "Back" }).className).toContain("bg-background");
  });
});

describe("Checkbox", () => {
  it("toggles checked state via onCheckedChange", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="agree" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "agree" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe("Switch", () => {
  it("toggles via onCheckedChange", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="enabled" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("switch", { name: "enabled" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("applies the sm size classes", () => {
    render(<Switch aria-label="enabled" size="sm" />);
    expect(screen.getByRole("switch", { name: "enabled" }).className).toContain("h-3.5");
  });
});

describe("Tabs", () => {
  it("switches content on trigger click", async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText("Content A")).toBeInTheDocument();
    await userEvent.click(screen.getByText("B"));
    expect(screen.getByText("Content B")).toBeInTheDocument();
  });

  it("is a pill by default", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="views">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByRole("tablist").className).toContain("bg-muted");
    expect(screen.getByRole("tab", { name: "A" }).className).toContain("rounded-md");
  });

  it("underline variant: hairline under the list, underline on the active tab, no pill track", async () => {
    render(
      <Tabs defaultValue="a" variant="underline">
        <TabsList aria-label="views">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    expect(list).toHaveAttribute("data-variant", "underline");
    expect(list.className).toContain("border-b");
    expect(list.className).toContain("overflow-x-auto");
    expect(list.className).not.toContain("bg-muted");
    const a = screen.getByRole("tab", { name: "A" });
    expect(a.className).toContain("border-b-2");
    expect(a.className).toContain("data-[state=active]:border-primary");
    expect(a.className).not.toContain("rounded-md");
    expect(a).toHaveAttribute("data-state", "active");
    await userEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByText("Content B")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("data-state", "active");
    expect(a).toHaveAttribute("data-state", "inactive");
  });

  it("underline variant keeps arrow-key navigation", async () => {
    render(
      <Tabs defaultValue="a" variant="underline">
        <TabsList aria-label="views">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>,
    );
    screen.getByRole("tab", { name: "A" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByText("Content B")).toBeInTheDocument();
  });

  it("shows a count badge after the label, also for zero", () => {
    render(
      <Tabs defaultValue="a" variant="underline">
        <TabsList aria-label="views">
          <TabsTrigger value="a" count={3}>
            Items
          </TabsTrigger>
          <TabsTrigger value="b" count={0}>
            Empty
          </TabsTrigger>
          <TabsTrigger value="c">Plain</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByRole("tab", { name: "Items 3" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Empty 0" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Plain" }).querySelector('[data-slot="tab-count"]')).toBeNull();
  });
});

describe("Separator", () => {
  it("renders with a separator role", () => {
    render(<Separator data-testid="sep" />);
    expect(screen.getByTestId("sep")).toBeInTheDocument();
  });
});

describe("ScrollArea", () => {
  it("renders its children", () => {
    render(
      <ScrollArea>
        <div>Scrollable content</div>
      </ScrollArea>,
    );
    expect(screen.getByText("Scrollable content")).toBeInTheDocument();
  });
});

describe("Table primitives", () => {
  it("renders a full table structure", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Widget</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Widget")).toBeInTheDocument();
  });
});

describe("DialogContent closeButtonTestId", () => {
  it("forwards closeButtonTestId onto the built-in close button", () => {
    render(
      <Dialog open>
        <DialogContent closeButtonTestId="dialog-header-close-button">
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByTestId("dialog-header-close-button")).toBeInTheDocument();
  });
});
