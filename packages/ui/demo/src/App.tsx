import {
  ActionButton,
  ActionSheet,
  AiActivity,
  AiMarker,
  AiSuggestion,
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
  ChatComposer,
  ChatComposerInput,
  ChatMessage,
  ChatMessageSkeleton,
  ChatSendButton,
  ChoiceBlock,
  Combobox,
  ConfidenceIndicator,
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
  EmptyState,
  FormField,
  FormModal,
  Input,
  KpiCard,
  Label,
  LoadingOverlay,
  LoadingSpinner,
  Modal,
  NavGroup,
  NavItem,
  NotificationBannerHost,
  NotificationBell,
  NotificationCard,
  NotificationPanel,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ResponsivePanel,
  SearchBar,
  SearchOverlay,
  SearchPanel,
  SearchTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollToBottomButton,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  Skeleton,
  StatusBadge,
  Stepper,
  SuggestionChips,
  TagCombobox,
  Textarea,
  ToastProvider,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useNotificationBanner,
  useToast,
} from "@bmsuisse/ui";
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Cog,
  FileText,
  FileUp,
  Info,
  LayoutGrid,
  ListFilter,
  MapPin,
  MessageSquare,
  Mic,
  Package,
  Percent,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

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

const ALL_SUPPLIERS = [
  { value: "00611", label: "00611 RIGIPS AG" },
  { value: "01952", label: "01952 SWISSPOR ROMANDIE SA" },
  { value: "00008817", label: "00008817 Sika Schweiz AG – VE PCI" },
  { value: "00010381", label: "00010381 Swisspor AG" },
  { value: "00010050", label: "00010050 Stanley Works (Europe) GmbH" },
  { value: "00009925", label: "00009925 Creabeton AG" },
];

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
  const [responsivePanelOpen, setResponsivePanelOpen] = useState(false);
  const [responsivePanelSize, setResponsivePanelSize] = useState<"sm" | "md" | "lg" | "xl">("lg");
  const [resizablePanelOpen, setResizablePanelOpen] = useState(false);
  const [wizardPanelOpen, setWizardPanelOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [country, setCountry] = useState<string | null>("ch");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>(["red", "blue"]);
  const [tagTeamMembers, setTagTeamMembers] = useState<string[]>(["alice"]);
  const [suppliers, setSuppliers] = useState<string[]>(["00611", "01952"]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierResults, setSupplierResults] = useState<{ value: string; label: string }[]>([]);
  const [supplierSearchLoading, setSupplierSearchLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [syncAction, setSyncAction] = useState<"ignore" | "create" | "update">("create");
  const [syncActionSmall, setSyncActionSmall] = useState<"ignore" | "create" | "update">("update");

  // Simulates a real server-driven search (debounced fetch + loading state) —
  // TagCombobox's onSearchChange doesn't debounce or fetch itself, that's the
  // caller's job, same contract as Combobox's own onSearchChange. Holds only
  // the raw search matches, deliberately not merged with the currently
  // selected suppliers here -- see `supplierOptions` below for why.
  useEffect(() => {
    if (supplierSearch.trim().length < 2) {
      setSupplierResults([]);
      setSupplierSearchLoading(false);
      return;
    }
    setSupplierSearchLoading(true);
    const timeout = setTimeout(() => {
      const term = supplierSearch.trim().toLowerCase();
      setSupplierResults(ALL_SUPPLIERS.filter((s) => s.label.toLowerCase().includes(term)));
      setSupplierSearchLoading(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [supplierSearch]);

  // Merging the currently-selected suppliers back in happens here, outside the
  // debounced effect above, specifically so it stays in sync with `suppliers`
  // on every render -- e.g. removing a chip immediately drops it from `options`
  // too, rather than waiting for the next keystroke to re-run that effect.
  const supplierOptions = ALL_SUPPLIERS.filter((s) => suppliers.includes(s.value)).concat(
    supplierResults.filter((s) => !suppliers.includes(s.value)),
  );

  return (
    <ToastProvider>
      <NotificationBannerHost>
      <div className="min-h-screen bg-background px-4 py-6 text-foreground md:p-8">
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

          <Section title="ResponsivePanel">
            <>
              <div className="flex flex-wrap gap-2">
                {(["sm", "md", "lg", "xl"] as const).map((size) => (
                  <Button
                    key={size}
                    variant="outline"
                    onClick={() => {
                      setResponsivePanelSize(size);
                      setResponsivePanelOpen(true);
                    }}
                  >
                    Open ({size})
                  </Button>
                ))}
              </div>
              <ResponsivePanel
                open={responsivePanelOpen}
                onOpenChange={setResponsivePanelOpen}
                title="New note"
                description={`size="${responsivePanelSize}" — wider dialog on desktop, taller drawer on mobile.`}
                size={responsivePanelSize}
                footer={<Button onClick={() => setResponsivePanelOpen(false)}>Close</Button>}
              >
                <div className="flex flex-col gap-3 text-sm">
                  <p>
                    Resize the window (or open dev tools' device toolbar) below 1024px to see it
                    switch from a centered dialog to a native drawer.
                  </p>
                  {Array.from({ length: 10 }, (_, i) => (
                    <p key={i}>
                      Filler paragraph {i + 1} — long enough content to show the size prop's
                      height cap on mobile once it starts scrolling instead of growing forever.
                    </p>
                  ))}
                </div>
              </ResponsivePanel>

              <div className="mt-3">
                <Button variant="outline" onClick={() => setResizablePanelOpen(true)}>
                  Open resizable, draggable, locked-outside-click panel
                </Button>
              </div>
              <ResponsivePanel
                open={resizablePanelOpen}
                onOpenChange={setResizablePanelOpen}
                title="Resizable panel"
                description="Drag any corner (desktop) or the top handle (mobile drawer) to resize, or drag this header to move the panel. Clicking outside won't close this one — use the X."
                resizable
                draggable
                closeOnOutsideClick={false}
                footer={<Button onClick={() => setResizablePanelOpen(false)}>OK</Button>}
              >
                <p className="text-sm">Try dragging a corner/handle, dragging the header, and clicking the overlay.</p>
              </ResponsivePanel>

              <div className="mt-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setWizardStep(0);
                    setWizardPanelOpen(true);
                  }}
                >
                  Open wizard (Previous/Next footer)
                </Button>
              </div>
              <ResponsivePanel
                open={wizardPanelOpen}
                onOpenChange={setWizardPanelOpen}
                title={`Step ${wizardStep + 1} of 3`}
                footer={
                  <div className="flex w-full justify-between">
                    <Button
                      variant="outline"
                      disabled={wizardStep === 0}
                      onClick={() => setWizardStep((s) => s - 1)}
                    >
                      Previous
                    </Button>
                    {wizardStep < 2 ? (
                      <Button onClick={() => setWizardStep((s) => s + 1)}>Next</Button>
                    ) : (
                      <Button onClick={() => setWizardPanelOpen(false)}>Done</Button>
                    )}
                  </div>
                }
              >
                <p className="text-sm">
                  Wrapping Previous/Next in a single `flex w-full justify-between` div pins them
                  to opposite corners instead of both landing on the right.
                </p>
              </ResponsivePanel>
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

          <Section title="TagCombobox (client-side filter)">
            <div className="w-80">
              <TagCombobox
                options={[
                  { value: "red", label: "Red" },
                  { value: "blue", label: "Blue" },
                  { value: "green", label: "Green" },
                  { value: "yellow", label: "Yellow" },
                  { value: "purple", label: "Purple" },
                ]}
                value={colors}
                onChange={setColors}
                placeholder="Select colors"
              />
            </div>
          </Section>

          <Section title="TagCombobox (server-driven search)">
            <div className="w-80">
              <TagCombobox
                data-testid="supplier-tag-combobox"
                options={supplierOptions}
                value={suppliers}
                onChange={setSuppliers}
                onSearchChange={setSupplierSearch}
                loading={supplierSearchLoading}
                placeholder="Search suppliers…"
                emptyMessage={supplierSearch.trim().length < 2 ? "Type to search…" : "No matches."}
              />
            </div>
          </Section>

          <Section title="TagCombobox (grouped)">
            <div className="w-80">
              <TagCombobox
                options={[
                  { value: "alice", label: "Alice", group: "team-a" },
                  { value: "andrew", label: "Andrew", group: "team-a" },
                  { value: "amy", label: "Amy", group: "team-a" },
                  { value: "carol", label: "Carol", group: "team-b" },
                  { value: "cyrus", label: "Cyrus", group: "team-b" },
                  { value: "eve", label: "Eve" },
                ]}
                groupLabels={{ "team-a": "Team A", "team-b": "Team B" }}
                value={tagTeamMembers}
                onChange={setTagTeamMembers}
                placeholder="Select team members"
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

          <Section title="KpiCard">
            <KpiCardDemo />
          </Section>

          <Section title="SearchBar / SearchPanel / SearchTrigger">
            <SearchDemo />
          </Section>

          <Section title="Toast (ToastProvider / useToast)">
            <ToastDemo />
          </Section>

          <Section title="Stepper">
            <StepperDemo />
          </Section>

          <Section title="EmptyState">
            <EmptyStateDemo />
          </Section>

          <Section title="AiMarker / ConfidenceIndicator">
            <AiPrimitivesDemo />
          </Section>

          <Section title="AiSuggestion">
            <AiSuggestionDemo />
          </Section>

          <Section title="ActionButton / ActionSheet">
            <ActionButtonDemo />
          </Section>

          <Section title="NotificationBell / NotificationCard / NotificationPanel">
            <NotificationCenterDemo />
          </Section>

          <Section title="NotificationBanner">
            <NotificationBannerDemo />
          </Section>

          <Section title="Chat (ChatMessage / AiActivity / ChoiceBlock / SuggestionChips / ChatComposer)">
            <ChatDemo />
          </Section>
        </div>
      </div>
      </NotificationBannerHost>
    </ToastProvider>
  );
}

function ToastDemo(): ReactElement {
  const { toast, dismiss } = useToast();
  return (
    <div className="flex w-full flex-col gap-3">
      <p className="max-w-prose text-sm text-muted-foreground">
        The stack sits bottom-right on desktop and full-width at the bottom on a phone. Errors and loading toasts
        stay until dismissed; everything else auto-closes after 5s with the timer paused on hover, focus or when the
        window loses focus. Swipe right to dismiss on touch, Escape on the keyboard, F8 to jump to the stack.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button data-testid="toast-success" onClick={() => toast.success("Customer saved", { description: "Muster Bau AG · 10023" })}>
          Success
        </Button>
        <Button
          variant="outline"
          data-testid="toast-error"
          onClick={() =>
            toast.error("Sync failed", {
              description: "3 visit reports could not be uploaded. They stay on this device until the next attempt.",
              action: { label: "Retry", onClick: () => toast.info("Retrying…") },
            })
          }
        >
          Error with action
        </Button>
        <Button variant="outline" onClick={() => toast.warning("Offline", { description: "Showing cached data from 08:42." })}>
          Warning
        </Button>
        <Button variant="outline" onClick={() => toast.info("New version available", { action: { label: "Reload", onClick: () => location.reload() } })}>
          Info
        </Button>
        <Button
          variant="outline"
          data-testid="toast-promise"
          onClick={() =>
            void toast
              .promise(sleep(1800).then(() => "Offer 2024-0812"), {
                loading: "Sending offer…",
                success: (ref) => `${ref} sent`,
                error: "Could not send offer",
              })
              .catch(() => undefined)
          }
        >
          Promise (loading → success)
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            toast({
              title: "Task deleted",
              action: { label: "Undo", onClick: () => toast.success("Task restored"), altText: "Undo deleting the task" },
            })
          }
        >
          Neutral with Undo
        </Button>
        <Button variant="ghost" onClick={() => dismiss()}>
          Dismiss all
        </Button>
      </div>
    </div>
  );
}

const WIZARD_STEPS = [
  { id: "upload", label: "Upload", description: "Capture" },
  { id: "match", label: "Match articles", description: "Capture" },
  { id: "review", label: "Review prices", description: "Check" },
  { id: "customer", label: "Customer" },
  { id: "send", label: "Send offer", description: "Done" },
];

function StepperDemo(): ReactElement {
  const [active, setActive] = useState("review");
  const [furthest, setFurthest] = useState("review");
  const activeIndex = WIZARD_STEPS.findIndex((s) => s.id === active);

  function go(delta: number): void {
    const next = WIZARD_STEPS[activeIndex + delta];
    if (!next) return;
    setActive(next.id);
    if (WIZARD_STEPS.findIndex((s) => s.id === next.id) > WIZARD_STEPS.findIndex((s) => s.id === furthest)) {
      setFurthest(next.id);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <Stepper steps={WIZARD_STEPS} activeStep={active} furthestStep={furthest} onStepChange={setActive} />
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">
            Completed steps are clickable; steps beyond <code className="text-xs">furthestStep</code> are not. Resize below{" "}
            <code className="text-xs">md</code> for the compact phone bar.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={activeIndex === 0}>
              Back
            </Button>
            <Button size="sm" onClick={() => go(1)} disabled={activeIndex === WIZARD_STEPS.length - 1}>
              Next
            </Button>
          </div>
        </div>
      </div>
      <div className="grid w-full gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Read-only, with an error step</p>
          <Stepper
            mobile="full"
            steps={[
              { id: "a", label: "Draft" },
              { id: "b", label: "Approval", error: true },
              { id: "c", label: "Signed" },
            ]}
            activeStep="b"
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Vertical</p>
          <Stepper
            orientation="vertical"
            activeStep="match"
            steps={WIZARD_STEPS.slice(0, 4)}
            onStepChange={() => undefined}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyStateDemo(): ReactElement {
  const { toast } = useToast();
  return (
    <div className="grid w-full gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card">
        <EmptyState
          title="No offers yet"
          description="Upload a supplier quote and the parser turns it into an offer you can send in minutes."
          action={{ label: "Upload quote", icon: FileUp, onClick: () => toast.info("Upload dialog would open") }}
          secondaryAction={{ label: "Create manually", icon: Plus, onClick: () => undefined }}
        />
      </div>
      <div className="rounded-2xl border border-border bg-card">
        <EmptyState
          variant="no-results"
          title="No customers match “Rigips Zürich”"
          description="Try fewer words, or search by customer number."
          action={{ label: "Clear search", onClick: () => undefined }}
        />
      </div>
      <div className="rounded-2xl border border-border bg-card">
        <EmptyState
          variant="error"
          title="Couldn't load visit reports"
          description="The server didn't answer in time. Your drafts are safe on this device."
          action={{ label: "Try again", icon: RefreshCw, onClick: () => toast.promise(sleep(1200), { loading: "Loading…", success: "Reports loaded", error: "Still failing" }) }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState size="sm" title="No open tasks" description="You're clear for today." />
        </div>
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState size="sm" variant="offline" title="Offline" description="Cached data from 08:42." />
        </div>
      </div>
    </div>
  );
}

const SEARCH_RESULTS: { group: string; items: { title: string; sub: string; icon: typeof Users }[] }[] = [
  {
    group: "Customers",
    items: [
      { title: "Muster Bau AG", sub: "10023 · Zürich", icon: Building2 },
      { title: "Musterhaus Sanitär GmbH", sub: "10871 · Winterthur", icon: Building2 },
      { title: "Mustermann Holzbau", sub: "11402 · Chur", icon: Building2 },
    ],
  },
  {
    group: "Appointments",
    items: [{ title: "Baustellenbesuch Muster Bau", sub: "Tomorrow · 09:30 · Zürich-Altstetten", icon: CalendarDays }],
  },
  {
    group: "Products",
    items: [
      { title: "Rigips RB 12.5 mm", sub: "Art. 204571 · 2'400 Stk. Lager", icon: Package },
      { title: "Rigips Fugenfüller Vario 25 kg", sub: "Art. 206113", icon: Package },
    ],
  },
];

function SearchResults({ query, onPick }: { query: string; onPick: () => void }): ReactElement {
  const q = query.trim().toLowerCase();
  const groups = SEARCH_RESULTS.map((g) => ({
    ...g,
    items: q ? g.items.filter((i) => `${i.title} ${i.sub}`.toLowerCase().includes(q)) : g.items,
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
        <p className="text-[15px] font-medium text-foreground">Nothing matches “{query.trim()}”</p>
        <p className="text-[13px] text-muted-foreground">Try a customer number, an article number or a place.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-1">
      {groups.map((g) => (
        <div key={g.group} className="py-1">
          <p className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {g.group}
          </p>
          {g.items.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={onPick}
              className="flex h-12 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none md:h-11"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-foreground md:text-[14px]">{item.title}</span>
                <span className="block truncate text-[12px] text-muted-foreground tabular-nums">{item.sub}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function SearchDemo(): ReactElement {
  const [barQuery, setBarQuery] = useState("");
  const [barLoading, setBarLoading] = useState(false);
  const [panelQuery, setPanelQuery] = useState("");
  const [mode, setMode] = useState("search");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayQuery, setOverlayQuery] = useState("");
  const [overlayMode, setOverlayMode] = useState("search");

  // Fake search-as-you-type latency so the spinner state is visible.
  useEffect(() => {
    if (!barQuery) {
      setBarLoading(false);
      return;
    }
    setBarLoading(true);
    const t = setTimeout(() => setBarLoading(false), 500);
    return () => clearTimeout(t);
  }, [barQuery]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlayOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const micButton = (
    <button
      type="button"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:h-8 md:w-8"
      aria-label="Voice search"
    >
      <Mic className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  const modes = [
    { key: "search", label: "Search", icon: Search },
    { key: "ask", label: "Ask AI", icon: Sparkles },
  ];

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          SearchBar — always-visible filter above a table. Enter fires <code>onSubmit</code>, Escape clears.
        </p>
        <SearchBar
          value={barQuery}
          onChange={setBarQuery}
          isLoading={barLoading}
          onSubmit={() => setBarLoading(false)}
          placeholder="Search customers…"
          aria-label="Search customers"
          trailingSlot={micButton}
          className="max-w-md"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          SearchTrigger — <code>icon</code> for a toolbar, <code>field</code> for a header. Both open the SearchOverlay
          (⌘K works too).
        </p>
        <div className="flex items-center gap-3">
          <SearchTrigger onClick={() => setOverlayOpen(true)} />
          <SearchTrigger
            variant="field"
            placeholder="Customers, articles, places…"
            shortcutHint="⌘K"
            onClick={() => setOverlayOpen(true)}
            className="min-w-0 max-w-xs flex-1"
          />
        </div>
        <SearchOverlay
          open={overlayOpen}
          onOpenChange={setOverlayOpen}
          value={overlayQuery}
          onChange={setOverlayQuery}
          placeholder="Customers, articles, places…"
          shortcutHint="Esc"
          trailingSlot={micButton}
          modes={modes}
          activeMode={overlayMode}
          onModeChange={setOverlayMode}
          footer={
            <div className="hidden items-center gap-4 px-4 py-2 text-[11px] text-muted-foreground md:flex">
              <span>
                <kbd className="rounded border border-border bg-muted/60 px-1 font-sans">↑↓</kbd> navigate
              </span>
              <span>
                <kbd className="rounded border border-border bg-muted/60 px-1 font-sans">↵</kbd> open
              </span>
              <span>
                <kbd className="rounded border border-border bg-muted/60 px-1 font-sans">esc</kbd> clear / close
              </span>
            </div>
          }
        >
          <SearchResults query={overlayQuery} onPick={() => setOverlayOpen(false)} />
        </SearchOverlay>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          SearchPanel — the in-page hero search (Cockpit). Headless: the results dropdown below is the caller’s.
        </p>
        <div className="w-full max-w-2xl">
          <SearchPanel
            value={panelQuery}
            onChange={setPanelQuery}
            placeholder={mode === "ask" ? "Ask anything about your customers…" : "Customers, articles, places…"}
            shortcutHint="⌘K"
            trailingSlot={micButton}
            modes={modes}
            activeMode={mode}
            onModeChange={setMode}
            expanded={panelQuery.length > 0}
          />
          {panelQuery.length > 0 && (
            <div className="rounded-b-2xl border border-t-0 border-border bg-card shadow-[0_8px_24px_-12px_rgb(0_0_0/0.18)]">
              <SearchResults query={panelQuery} onPick={() => setPanelQuery("")} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCardDemo(): ReactElement {
  const [loading, setLoading] = useState(false);
  const [tapped, setTapped] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Cockpit “Ziel” zone as the field-sales app lays it out: two heroes, then minis in a two-up grid on a phone.
          {tapped && <span className="ml-2 text-foreground">Tapped: {tapped}</span>}
        </p>
        <Button size="sm" variant="outline" onClick={() => setLoading((v) => !v)}>
          {loading ? "Show data" : "Show loading"}
        </Button>
      </div>

      {/* Same split as OneSales' Cockpit: heroes in their own row (full-width on a
          phone, side by side from sm), minis two-up on a phone and three-up from sm. */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          variant="hero"
          icon={TrendingUp}
          label="Umsatz laufendes Jahr"
          value="CHF 1.24 Mio."
          loading={loading}
          badge={{ text: "+12%", positive: true }}
          badgeLabel="vs. Vorjahr"
          sub="LY CHF 1.07 Mio. · noch CHF 118k"
          progress={72}
          progressLabel="72% Budget"
          sparkline={[64, 71, 68, 83, 79, 92, 104, 99, 118, 121]}
          onClick={() => setTapped("Umsatz")}
          className="sm:col-span-1"
        />
        <KpiCard
          variant="hero"
          icon={Wallet}
          label="Marge laufendes Jahr"
          value="CHF 312k"
          loading={loading}
          badge={{ text: "-3%", positive: false }}
          badgeLabel="vs. Vorjahr"
          sub="LY CHF 341k · noch CHF 29k"
          progress={58}
          progressLabel="58% Budget"
          sparkline={[22, 24, 21, 26, 23, 27, 25, 29, 28, 30]}
          className="sm:col-span-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          variant="mini"
          icon={Users}
          label="Aktive Kunden"
          value="1'042"
          loading={loading}
          sub="14 gefährdet"
          subTone="warn"
          href="#customers"
        />
        <KpiCard
          variant="mini"
          icon={Wallet}
          label="Private Label (vorläufig)"
          value="18%"
          loading={loading}
          sub="CHF 224k"
        />
        <KpiCard
          variant="mini"
          icon={UserPlus}
          label="Neukunden"
          value="37"
          loading={loading}
          badge={{ text: "+9", positive: true }}
          sub="CHF 86k Umsatz"
        />
        <KpiCard
          variant="mini"
          icon={Percent}
          label="Ø Umsatz pro aktivem Monat (Proxy)"
          value="CHF 138k"
          loading={loading}
          sub="9 aktive Monate"
        />
        <KpiCard
          variant="mini"
          icon={Package}
          label="Auftragsbestand"
          value="CHF 412k"
          loading={loading}
          sparkline={[30, 34, 31, 38, 41, 39, 44]}
          onClick={() => setTapped("Auftragsbestand")}
        />
        <KpiCard variant="mini" icon={MapPin} label="Besuche" value="212" loading={loading} badge={{ text: "-4%", positive: false }} sub="LY 221" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          variant="mini"
          icon={ClipboardCheck}
          label="Nachfassquote"
          value="84%"
          loading={loading}
          sub="21 / 25 erledigt"
          href="#tasks"
        />
        <KpiCard
          variant="mini"
          icon={CalendarDays}
          label="Termine diese Woche"
          value="—"
          loading={loading}
          sub="Kalender nicht erreichbar"
          subTone="danger"
        />
        <KpiCard
          variant="mini"
          icon={Clock}
          label="Überfällig"
          value="2"
          loading={loading}
          sub="seit 3 Tagen"
          subTone="danger"
          sparkline={[1, 2, 2, 3, 2]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          default + donut — the customer-detail KPI grid. Unit and currency step down so the magnitude leads.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Umsatz 12 Monate"
            value="CHF 184'300"
            icon={TrendingUp}
            loading={loading}
            badge={{ text: "+8%", positive: true }}
            badgeLabel="vs. Vorjahr"
            sparkline={[12, 14, 13, 15, 16, 15, 17, 18]}
          />
          <KpiCard label="Offene Posten" value="12 kunden" icon={Users} loading={loading} sub="CHF 41'200 fällig" subTone="warn" />
          <KpiCard label="Konversion" value="3.4 %" loading />
          <KpiCard
            label="Umsatz nach Kanal"
            variant="donut"
            loading={loading}
            centerValue="1.2M"
            segments={[
              { label: "Direkt", value: 52 },
              { label: "Partner", value: 31 },
              { label: "Online", value: 17 },
            ]}
          />
          <KpiCard
            label="Pipeline"
            variant="donut"
            loading={loading}
            sub="34 offene Deals"
            segments={[
              { label: "Gewonnen", value: 18 },
              { label: "Verhandlung", value: 9 },
              { label: "Verloren", value: 7 },
            ]}
          />
          <KpiCard label="Teamauslastung" variant="donut" loading />
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

function AiPrimitivesDemo(): ReactElement {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        <code>AiMarker</code> is the shared provenance glyph for anything a model touched; <code>pulse</code>{" "}
        swaps its label for an in-progress message and switches on <code>role="status"</code> instead of
        spinning. <code>ConfidenceIndicator</code> never uses green (reserved for human-verified statuses) or
        red (reserved for real errors) — only amber at the low band, everything else in the dedicated{" "}
        <code>--ai</code> hue or a muted foreground tint.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <AiMarker />
        <AiMarker variant="inline" label="AI generated" />
        <AiMarker size="xs" label="Auto-filled" />
        <AiMarker pulse label="Extracting…" />
      </div>

      <div className="flex flex-col gap-2">
        <ConfidenceIndicator value={0.94} />
        <ConfidenceIndicator value={0.7} />
        <ConfidenceIndicator value={0.42} />
        <ConfidenceIndicator value={null} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ConfidenceIndicator value={0.87} format="meter" />
        <ConfidenceIndicator value={0.87} format="label" />
        <ConfidenceIndicator value={0.87} format="percent" />
        <ConfidenceIndicator value={0.87} showPercent />
      </div>
    </div>
  );
}

type DemoSuggestionStatus = "loading" | "pending" | "accepted" | "edited" | "rejected";

function AiSuggestionDemo(): ReactElement {
  const [matchStatus, setMatchStatus] = useState<DemoSuggestionStatus>("pending");
  const [qtyStatus, setQtyStatus] = useState<DemoSuggestionStatus>("pending");

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        An offer parser's per-field match override: the model proposes a catalog match for a supplier line
        item, and the buyer accepts, edits or rejects it before the offer is saved. <code>status</code> is
        controlled by the consumer, so a dirty-field guard can own the transition.
      </p>

      <AiSuggestion
        status={matchStatus}
        confidence={0.91}
        label="Suggested from PDF"
        meta="gpt-x · 2 min ago"
        onAccept={() => setMatchStatus("accepted")}
        onEdit={() => setMatchStatus("edited")}
        onReject={() => setMatchStatus("rejected")}
        onRestore={() => setMatchStatus("pending")}
      >
        <div className="flex flex-col gap-0.5 text-sm">
          <span className="font-medium text-foreground">Art. 48213 — Stainless steel elbow 90°, DN50</span>
          <span className="text-muted-foreground">matched from “Rohrbogen 90° DN50 Edelstahl”</span>
        </div>
      </AiSuggestion>

      <AiSuggestion status="loading" label="Matching supplier line item…">
        <span />
      </AiSuggestion>

      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Dense field list (inline layout)</p>
        <div className="flex flex-col gap-2">
          <AiSuggestion
            layout="inline"
            status={qtyStatus}
            confidence={0.58}
            onAccept={() => setQtyStatus("accepted")}
            onEdit={() => setQtyStatus("edited")}
            onReject={() => setQtyStatus("rejected")}
            onRestore={() => setQtyStatus("pending")}
          >
            <span className="text-sm">Quantity: 240 pcs</span>
          </AiSuggestion>
          <AiSuggestion layout="inline" status="accepted">
            <span className="text-sm">Unit: EA</span>
          </AiSuggestion>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setMatchStatus("pending")}>
          Reset block demo
        </Button>
        <Button variant="outline" size="sm" onClick={() => setQtyStatus("pending")}>
          Reset inline demo
        </Button>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    id: "new-order",
    label: "New order",
    sublabel: "Start from a blank form",
    icon: Plus,
    onSelect: () => {},
  },
  { id: "scan", label: "Scan barcode", sublabel: "Add a line by scanning", icon: ScanLine, onSelect: () => {} },
  { id: "customer", label: "New customer", icon: UserPlus, onSelect: () => {} },
];

const QUICK_SECONDARY = [
  { id: "search", label: "Search", icon: Search, onSelect: () => {} },
  { id: "feedback", label: "Send feedback", icon: MessageSquare, onSelect: () => {} },
];

function ActionButtonDemo(): ReactElement {
  const [showCorner, setShowCorner] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="max-w-prose text-sm text-muted-foreground">
        The floating “+” that replaces a tab-bar FAB plus two hand-rolled bottom sheets: a bottom sheet list
        on a phone, a dropdown menu anchored to a 36px trigger from <code>md</code> up.{" "}
        <code>placement="corner"</code> is <code>position: fixed</code>, so it's toggled on here rather than
        mounted permanently — it would otherwise float over the rest of this page.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setShowCorner((v) => !v)}>
          {showCorner ? "Hide corner FAB" : "Show corner FAB"}
        </Button>
        <span className="text-sm text-muted-foreground">Docked (tab-bar slot):</span>
        <ActionButton
          label="Quick actions"
          placement="docked"
          actions={QUICK_ACTIONS}
          secondaryActions={QUICK_SECONDARY}
          sheetTitle="New"
        />
        <Button variant="ghost" onClick={() => setSheetOpen(true)}>
          Open ActionSheet standalone
        </Button>
      </div>
      {showCorner && (
        <ActionButton
          label="Quick actions"
          placement="corner"
          actions={QUICK_ACTIONS}
          secondaryActions={QUICK_SECONDARY}
          sheetTitle="New"
        />
      )}
      <ActionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="New"
        actions={QUICK_ACTIONS}
        secondaryActions={QUICK_SECONDARY}
      />
    </div>
  );
}

interface DemoNotification {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
  unread: boolean;
  source: "system" | "person" | "ai";
  actor?: { name: string };
  priority?: "normal" | "high";
}

const INITIAL_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "n1",
    title: "Price list import finished",
    body: "1,204 articles updated, 3 warnings to review before publishing.",
    timestamp: new Date(Date.now() - 2 * 60_000),
    unread: true,
    source: "system",
  },
  {
    id: "n2",
    title: "Maria Keller approved your quote",
    body: "Quote #10432 for Muster Bau AG is ready to send.",
    timestamp: new Date(Date.now() - 55 * 60_000),
    unread: true,
    source: "person",
    actor: { name: "Maria Keller" },
  },
  {
    id: "n3",
    title: "Contract renewal due in 3 days",
    body: "Rigips Zürich's service contract expires Friday — no renewal drafted yet.",
    timestamp: new Date(Date.now() - 5 * 3_600_000),
    unread: true,
    source: "system",
    priority: "high",
  },
  {
    id: "n4",
    title: "Draft summary ready",
    body: "The assistant drafted a reply to the delivery delay complaint.",
    timestamp: new Date(Date.now() - 26 * 3_600_000),
    unread: false,
    source: "ai",
  },
  {
    id: "n5",
    title: "Weekly report generated",
    body: "Visit reports for last week are ready to download.",
    timestamp: new Date(Date.now() - 9 * 86_400_000),
    unread: false,
    source: "system",
  },
];

function NotificationCenterDemo(): ReactElement {
  const [panelOpen, setPanelOpen] = useState(false);
  const [items, setItems] = useState(INITIAL_NOTIFICATIONS);
  const bellRef = useRef<HTMLButtonElement>(null);

  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        <strong className="text-foreground">Toast</strong> is feedback about what you just did (saved, failed,
        undo) — five seconds at the thumb edge, then gone.{" "}
        <strong className="text-foreground">NotificationCenter</strong> is for events that happened elsewhere
        (a background job finished, an approval landed, a reminder came due) — it persists until acted on and
        lives in an inbox so it can be found again. Never route an event through <code>toast()</code>.
      </p>
      <div className="flex items-center gap-2">
        <NotificationBell
          ref={bellRef}
          count={unreadCount}
          open={panelOpen}
          onClick={() => setPanelOpen((v) => !v)}
        />
        <span className="text-sm text-muted-foreground">Click the bell to open the inbox</span>
      </div>
      <NotificationPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        anchor={bellRef}
        unreadCount={unreadCount}
        onMarkAllRead={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}
        footer={
          <Button variant="ghost" size="sm" className="w-full justify-center">
            View all notifications
          </Button>
        }
      >
        {items.map((n) => (
          <NotificationCard
            key={n.id}
            title={n.title}
            body={n.body}
            timestamp={n.timestamp}
            unread={n.unread}
            source={n.source}
            actor={n.actor}
            priority={n.priority}
            onSelect={() => setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, unread: false } : i)))}
            onDismiss={() => setItems((prev) => prev.filter((i) => i.id !== n.id))}
            actions={n.source === "person" ? [{ label: "Open quote", onClick: () => {} }] : undefined}
          />
        ))}
      </NotificationPanel>
    </div>
  );
}

function NotificationBannerDemo(): ReactElement {
  const { show } = useNotificationBanner();

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="max-w-prose text-sm text-muted-foreground">
        The arrival surface, anchored at the top on purpose: the Toast stack owns the bottom edge on a phone,
        and so does a corner <code>ActionButton</code>, so nothing has to negotiate for the same space. A
        normal banner clears itself after 8s; a <code>high</code> one waits to be acted on.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            show({
              title: "New comment from Maria Keller",
              body: "“Can we revisit the Q3 assumption?” on the Q3 forecast.",
              timestamp: new Date(),
              source: "person",
              actor: { name: "Maria Keller" },
            })
          }
        >
          Show normal banner (8s)
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            show({
              title: "Approval required",
              body: "The refund for order #10493 needs your sign-off before it can be processed.",
              timestamp: new Date(),
              priority: "high",
              actions: [{ label: "Review", onClick: () => {} }],
            })
          }
        >
          Show high-priority banner (stays)
        </Button>
      </div>
    </div>
  );
}

const CHAT_SUPPLIER_CHOICES = [
  { id: "sika-ve", label: "Sika Schweiz AG – VE PCI", description: "Zurich · last order 3 weeks ago" },
  { id: "sika-bau", label: "Sika Schweiz AG – Bauchemie", description: "Zurich · last order 5 months ago" },
];

const CHAT_APPROVAL_CHOICES = [
  { id: "approve", label: "Approve" },
  { id: "deny", label: "Deny", description: "The mail stays in drafts" },
];

const CHAT_SUGGESTIONS = [
  { id: "summarize", label: "Summarize this thread", icon: Sparkles },
  { id: "draft", label: "Draft a reply", icon: MessageSquare },
  { id: "invoices", label: "Find related invoices", icon: FileText },
];

/**
 * Assembles the new chat primitives into one realistic transcript, the way
 * they compose inside assistant-ui's `render={<Component/>}` slots in
 * OneSales — not as isolated swatches. `ChoiceBlock`/`AiActivity` stay
 * controlled here the same way a headless runtime would own them.
 */
function ChatDemo(): ReactElement {
  const [supplierChoice, setSupplierChoice] = useState<string | null>(null);
  const [approvalChoice, setApprovalChoice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(true);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <p className="max-w-prose text-sm text-muted-foreground">
        One transcript, not a swatch grid: a disambiguation <code>ChoiceBlock</code>, an amber approval
        one, a running then a denied-step <code>AiActivity</code>, a loading <code>ChatMessageSkeleton</code>,
        and a docked <code>ChatComposer</code> with the send/stop morph and scroll-to-bottom pill.
      </p>

      <div className="relative flex h-[32rem] w-full flex-col overflow-hidden rounded-2xl border border-border">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <ChatMessage role="user">Who's the usual supplier for gypsum board on the Rigi site?</ChatMessage>

          <ChatMessage role="assistant" marker>
            There are two Sika accounts that match — which one do you mean?
          </ChatMessage>

          <ChoiceBlock
            question="Which supplier account?"
            options={CHAT_SUPPLIER_CHOICES}
            value={supplierChoice}
            onSelect={(option) => setSupplierChoice(option.id)}
          />

          {supplierChoice && (
            <>
              <ChatMessage role="assistant">
                <AiActivity
                  status={supplierChoice ? "done" : "running"}
                  idleLabel="Looking up recent orders…"
                  steps={[
                    { id: "lookup", label: "Queried supplier ledger", status: "done", detail: "SELECT * FROM orders" },
                    { id: "match", label: "Matched account VE PCI", status: "done" },
                  ]}
                />
                Found 6 orders in the last quarter, all under the VE PCI account.
              </ChatMessage>

              <ChatMessage role="assistant" marker>
                <AiActivity
                  status="done"
                  steps={[
                    { id: "draft", label: "Drafted a reorder email", status: "done" },
                    { id: "send", label: "Send email to purchasing@sika.ch", status: "denied" },
                  ]}
                />
                I've drafted the reorder — sending it needs your sign-off first.
              </ChatMessage>

              <ChoiceBlock
                tone="warning"
                eyebrow="Approval required"
                meta="send_email"
                question="Send the reorder email to purchasing@sika.ch?"
                options={CHAT_APPROVAL_CHOICES}
                value={approvalChoice}
                onSelect={(option) => setApprovalChoice(option.id)}
              />
            </>
          )}

          {!supplierChoice && <ChatMessageSkeleton turns={1} />}

          <SuggestionChips layout="row" suggestions={CHAT_SUGGESTIONS} onPick={() => {}} />
        </div>

        <div className="relative flex flex-col items-center border-t border-border p-2">
          <ScrollToBottomButton
            visible={showScrollToBottom}
            offset="-3.25rem"
            onClick={() => setShowScrollToBottom(false)}
          />
          <ChatComposer
            className="w-full"
            action={
              <ChatSendButton
                state={sending ? "stop" : "send"}
                onClick={() => setSending((v) => !v)}
              />
            }
          >
            <ChatComposerInput
              placeholder="Ask about a supplier, order, or site…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onSubmit={() => setSending(true)}
            />
          </ChatComposer>
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-fit" onClick={() => setShowScrollToBottom((v) => !v)}>
        Toggle scroll-to-bottom pill
      </Button>
    </div>
  );
}
