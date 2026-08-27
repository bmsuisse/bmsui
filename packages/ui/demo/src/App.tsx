import {
  AlertBox,
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Combobox,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FormField,
  FormModal,
  Input,
  Label,
  LoadingOverlay,
  LoadingSpinner,
  Modal,
  NavGroup,
  NavItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  Skeleton,
  StatusBadge,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@bmsuisse/ui";
import {
  ClipboardCheck,
  Cog,
  Info,
  LayoutGrid,
  ListFilter,
  Percent,
} from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";

function Section({ title, children }: { title: string; children: ReactElement }): ReactElement {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function App(): ReactElement {
  // Mirrors packages/datagrid/demo's own dark-mode convention: toggle the
  // `dark` class on <html>, since globals.css's token overrides are scoped
  // to `html.dark` (see its `@custom-variant dark (&:is(.dark *))` comment)
  // — toggling a class on a wrapping <div> instead flips `dark:`-prefixed
  // utility classes but never the CSS-variable-driven tokens (bg-background,
  // text-foreground, etc.), which is most of what this demo actually uses.
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  function toggleDarkMode(): void {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [country, setCountry] = useState<string | null>("ch");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [syncAction, setSyncAction] = useState<"ignore" | "create" | "update">("create");
  const [syncActionSmall, setSyncActionSmall] = useState<"ignore" | "create" | "update">("update");

  return (
    <div>
      <div className="min-h-screen bg-background p-8 text-foreground">
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">@bmsuisse/ui</h1>
              <p className="text-sm text-muted-foreground">Shared primitives — visual QA demo</p>
            </div>
            <Button variant="outline" data-testid="dark-mode-toggle" onClick={toggleDarkMode}>
              {dark ? "Light mode" : "Dark mode"}
            </Button>
          </header>

          <Section title="Buttons">
            <>
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button size="sm">Small</Button>
              <Button disabled>Disabled</Button>
            </>
          </Section>

          <Section title="Badges">
            <>
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </>
          </Section>

          <Section title="Form fields">
            <div className="flex w-full max-w-sm flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Jane Doe" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Anything else?" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role">Role</Label>
                <Select defaultValue="admin">
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <Section title="Card">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Monthly revenue</CardTitle>
                <CardDescription>Compared to last month</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">CHF 42,300</p>
              </CardContent>
              <CardFooter>
                <Button size="sm">View details</Button>
              </CardFooter>
            </Card>
          </Section>

          <Section title="Dialog">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete customer?</DialogTitle>
                  <DialogDescription>This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button variant="destructive">Delete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>

          <Section title="Popover">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm">Popover content goes here.</p>
              </PopoverContent>
            </Popover>
          </Section>

          <Section title="Skeleton">
            <div className="flex w-full max-w-sm flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          </Section>

          <Section title="Modal / ConfirmDialog / FormModal">
            <>
              <Button variant="outline" onClick={() => setModalOpen(true)}>
                Open Modal
              </Button>
              <Modal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title="Order #4821"
                description="Placed 2026-08-10"
                footer={<Button onClick={() => setModalOpen(false)}>Close</Button>}
              >
                <p className="text-sm">Plain structural wrapper — header, body, optional footer.</p>
              </Modal>

              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Delete customer…
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete customer?"
                description="This action cannot be undone."
                variant="destructive"
                confirmLabel="Delete"
                onConfirm={() => sleep(800)}
              />

              <Button variant="outline" onClick={() => setFormModalOpen(true)}>
                Edit customer…
              </Button>
              <FormModal
                open={formModalOpen}
                onOpenChange={setFormModalOpen}
                title="Edit customer"
                submitLabel="Save changes"
                onSubmit={async () => {
                  if (!customerName.trim()) {
                    setFieldError("Name is required");
                    return;
                  }
                  setFieldError(undefined);
                  await sleep(800);
                  setFormModalOpen(false);
                }}
              >
                <FormField label="Name" required error={fieldError}>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </FormField>
              </FormModal>
            </>
          </Section>

          <Section title="AlertBox">
            <div className="flex w-full flex-col gap-3">
              <AlertBox variant="error" title="Something went wrong">
                Could not save the customer. Please try again.
              </AlertBox>
              <AlertBox variant="warning" title="Heads up">
                This offer expires in 3 days.
              </AlertBox>
              <AlertBox variant="info">New filters are available in the sidebar.</AlertBox>
              <AlertBox variant="success" title="Saved">
                Your changes have been saved.
              </AlertBox>
            </div>
          </Section>

          <Section title="StatusBadge">
            <>
              <StatusBadge status="approved" />
              <StatusBadge status="pending" />
              <StatusBadge status="rejected" />
              <StatusBadge status="archived" />
              <StatusBadge status="new" />
              <StatusBadge status="custom_status" toneMap={{ custom_status: "info" }} />
            </>
          </Section>

          <Section title="ButtonGroup">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Default size</Label>
                <ButtonGroup
                  options={[
                    { value: "ignore", label: "Ignore" },
                    { value: "create", label: "Create" },
                    { value: "update", label: "Update" },
                  ]}
                  value={syncAction}
                  onValueChange={setSyncAction}
                  aria-label="Contact sync action"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Small, disabled</Label>
                <ButtonGroup
                  size="sm"
                  options={[
                    { value: "ignore", label: "Ignore" },
                    { value: "create", label: "Create" },
                    { value: "update", label: "Update" },
                  ]}
                  value={syncActionSmall}
                  onValueChange={setSyncActionSmall}
                  disabled
                  aria-label="Contact sync action (disabled)"
                />
              </div>
            </div>
          </Section>

          <Section title="DropdownMenu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Order #4821</DropdownMenuLabel>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={setShowArchived}>
                  Show archived
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem danger>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Section>

          <Section title="Combobox (autocomplete)">
            <div className="w-64">
              <Combobox
                options={[
                  { value: "ch", label: "Switzerland" },
                  { value: "de", label: "Germany" },
                  { value: "fr", label: "France" },
                  { value: "it", label: "Italy" },
                  { value: "at", label: "Austria" },
                  { value: "us", label: "United States", disabled: true },
                ]}
                value={country}
                onChange={setCountry}
                placeholder="Select a country"
                searchPlaceholder="Search countries…"
              />
            </div>
          </Section>

          <Section title="Combobox (grouped, multi-select)">
            <div className="w-64">
              <Combobox
                multiple
                options={[
                  { value: "alice", label: "Alice", group: "team-a" },
                  { value: "andrew", label: "Andrew", group: "team-a" },
                  { value: "amy", label: "Amy", group: "team-a" },
                  { value: "bob", label: "Bob", group: "team-a" },
                  { value: "bella", label: "Bella", group: "team-a" },
                  { value: "carol", label: "Carol", group: "team-b" },
                  { value: "cyrus", label: "Cyrus", group: "team-b" },
                  { value: "cindy", label: "Cindy", group: "team-b" },
                  { value: "dave", label: "Dave", group: "team-b" },
                  { value: "diana", label: "Diana", group: "team-b" },
                  { value: "frank", label: "Frank", group: "team-c" },
                  { value: "fiona", label: "Fiona", group: "team-c" },
                  { value: "george", label: "George", group: "team-c" },
                  { value: "eve", label: "Eve" },
                ]}
                groupLabels={{ "team-a": "Team A", "team-b": "Team B", "team-c": "Team C" }}
                value={teamMembers}
                onChange={setTeamMembers}
                placeholder="Select team members"
                searchPlaceholder="Search…"
              />
            </div>
          </Section>

          <Section title="LoadingSpinner">
            <>
              <LoadingSpinner size="sm" />
              <LoadingSpinner label="Loading…" />
              <LoadingSpinner size="lg" label="Saving…" />
              <div className="w-full max-w-sm rounded-md border">
                <LoadingOverlay label="Fetching orders…" />
              </div>
            </>
          </Section>

          <Section title="Button variants (secondary / link) & sizes">
            <>
              <Button variant="secondary">Secondary</Button>
              <Button variant="link">Link</Button>
              <Button size="xs">XS</Button>
              <Button size="lg">Large</Button>
              <Button size="icon-xs" aria-label="Icon xs">
                +
              </Button>
              <Button size="icon-lg" aria-label="Icon lg">
                +
              </Button>
            </>
          </Section>

          <Section title="Sheet">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Order details</SheetTitle>
                  <SheetDescription>Slides in from the right by default.</SheetDescription>
                </SheetHeader>
                <p className="mt-4 text-sm">Sheet body content goes here.</p>
              </SheetContent>
            </Sheet>
          </Section>

          <Section title="Tooltip">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover me</Button>
                </TooltipTrigger>
                <TooltipContent>Helpful context goes here.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Section>

          <Section title="Sidebar / NavGroup / NavItem">
            <SidebarDemo />
          </Section>
        </div>
      </div>
    </div>
  );
}

function SidebarDemo(): ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("overview");

  const item = (key: string, icon: typeof LayoutGrid, label: string) => (
    <NavItem
      as="button"
      type="button"
      icon={icon}
      label={label}
      active={active === key}
      onClick={() => setActive(key)}
    />
  );

  return (
    <div className="flex h-[420px] overflow-hidden rounded-lg border border-border">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        resizable
        header={(isCollapsed) => (
          <span className="truncate text-sm font-semibold">{isCollapsed ? "D" : "Demo App"}</span>
        )}
        footer="v0.7.0"
      >
        <NavGroup label="Work">
          {item("overview", LayoutGrid, "Overview")}
          {item("approvals", ClipboardCheck, "Approvals")}
        </NavGroup>
        <NavGroup label="Bonus rules" defaultCollapsed>
          {item("rules", Percent, "Bonus Rules")}
          {item("templates", ListFilter, "Filter Templates")}
        </NavGroup>
        <NavGroup label="Info">
          {item("info", Info, "Info")}
          {item("settings", Cog, "Settings")}
        </NavGroup>
      </Sidebar>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Drag the sidebar's right edge to resize, or use the header button to rail-collapse it.
      </div>
    </div>
  );
}
