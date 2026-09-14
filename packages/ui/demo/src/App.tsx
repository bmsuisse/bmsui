import {
  AiButton,
  AiExplainButton,
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
  Checkbox,
  Combobox,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DonutChart,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
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
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  ResponsivePanel,
  ScrollArea,
  SearchBar,
  SearchPanel,
  SearchTrigger,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  SidebarNav,
  Skeleton,
  Sparkline,
  StatusBadge,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TagCombobox,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  VoiceInputButton,
  VoiceTranscript,
  cn,
  useMediaQuery,
  useSidebarCollapsed,
} from "@bmsuisse/ui";
import {
  BookOpen,
  ClipboardCheck,
  Cog,
  DollarSign,
  Info,
  LayoutGrid,
  ListFilter,
  Percent,
  Search,
  ShoppingCart,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

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

          <Section title="Popover (anchored)">
            <Popover>
              <PopoverAnchor asChild>
                <span className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                  Anchor element — the popover aligns to this box, not the trigger
                </span>
              </PopoverAnchor>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Open anchored
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 text-sm">
                Positioned against the dashed anchor above.
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
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    Copy link
                    <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Move to…</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={syncAction}
                        onValueChange={(value) => setSyncAction(value as typeof syncAction)}
                      >
                        <DropdownMenuRadioItem value="ignore">Backlog</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="create">In progress</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="update">Done</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
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
                <SheetFooter>
                  <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button>Save</Button>
                  </SheetClose>
                </SheetFooter>
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

          <Section title="AI actions">
            <AiActionsDemo />
          </Section>

          <Section title="Voice input & transcript">
            <VoiceDemo />
          </Section>

          <Section title="Checkbox / Switch">
            <CheckboxSwitchDemo />
          </Section>

          <Section title="Tabs">
            <Tabs defaultValue="overview" className="w-full max-w-md">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="pt-3 text-sm text-muted-foreground">
                Summary of the selected order.
              </TabsContent>
              <TabsContent value="activity" className="pt-3 text-sm text-muted-foreground">
                Who changed what, and when.
              </TabsContent>
              <TabsContent value="settings" className="pt-3 text-sm text-muted-foreground">
                Per-order preferences.
              </TabsContent>
            </Tabs>
          </Section>

          <Section title="Table">
            <Table>
              <TableCaption>Recent orders</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>#4821</TableCell>
                  <TableCell>Rigips AG</TableCell>
                  <TableCell className="text-right">CHF 1'240</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>#4822</TableCell>
                  <TableCell>Swisspor AG</TableCell>
                  <TableCell className="text-right">CHF 880</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">CHF 2'120</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Section>

          <Section title="Separator / ScrollArea">
            <div className="flex w-full max-w-md flex-col gap-3">
              <div className="flex h-5 items-center gap-3 text-sm">
                <span>Docs</span>
                <Separator orientation="vertical" />
                <span>Source</span>
                <Separator orientation="vertical" />
                <span>Issues</span>
              </div>
              <Separator />
              <ScrollArea className="h-32 rounded-md border border-border p-3">
                <ul className="flex flex-col gap-2 text-sm">
                  {ALL_SUPPLIERS.concat(ALL_SUPPLIERS).map((supplier, index) => (
                    <li key={`${supplier.value}-${index}`} className={cn(index === 0 && "font-medium")}>
                      {supplier.label}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          </Section>

          <Section title="Select (grouped)">
            <div className="w-64">
              <Select value={country ?? undefined} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ch">Switzerland</SelectItem>
                    <SelectItem value="at">Austria</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectItem value="fr">France</SelectItem>
                    <SelectItem value="it">Italy</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </Section>

          <Section title="Sparkline / DonutChart (standalone)">
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Sparkline</span>
                <Sparkline data={[4, 9, 6, 12, 10, 16, 14, 21]} color="#8b5cf6" />
              </div>
              <DonutChart
                data={[
                  { label: "Open", value: 42 },
                  { label: "In progress", value: 23 },
                  { label: "Done", value: 35 },
                ]}
                centerValue="100"
                centerLabel="orders"
              />
            </div>
          </Section>

          <Section title="SidebarNav (standalone) / useSidebarCollapsed / useMediaQuery">
            <SidebarNavDemo />
          </Section>
        </div>
      </div>
    </div>
  );
}

function SearchDemo(): ReactElement {
  const [barQuery, setBarQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelQuery, setPanelQuery] = useState("");
  const [mode, setMode] = useState("search");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          SearchBar — an always-visible pill input, e.g. filtering a table.
        </p>
        <SearchBar value={barQuery} onChange={setBarQuery} placeholder="Search customers…" className="max-w-md" />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          SearchTrigger — an icon-only header button that opens a search overlay (here, a SearchPanel).
        </p>
        <div className="relative inline-block">
          <SearchTrigger onClick={() => setPanelOpen((v) => !v)} />
          {panelOpen && (
            <div className="absolute top-full left-0 z-10 mt-2 w-[420px]">
              <SearchPanel
                value={panelQuery}
                onChange={setPanelQuery}
                placeholder="Customers, visits, places…"
                shortcutHint="⌘K"
                trailingSlot={
                  <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Voice search">
                    <Search className="h-4 w-4" aria-hidden="true" />
                  </button>
                }
                modes={[
                  { key: "search", label: "Search", icon: Search },
                  { key: "ask", label: "Ask AI", icon: Sparkles },
                ]}
                activeMode={mode}
                onModeChange={setMode}
                expanded
              />
              <div className="rounded-b-2xl border border-t-0 border-border bg-card px-4 py-5 text-center text-[12px] text-muted-foreground shadow-sm">
                Results go here — SearchPanel owns none of this, just the input chrome above.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCardDemo(): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <KpiCard
          label="Revenue"
          value="1.2M"
          variant="hero"
          icon={DollarSign}
          badge={{ text: "+12%", positive: true }}
          sub="vs. 1.07M last year"
          progress={72}
          progressLabel="72% of target"
          sparkline={[4, 6, 5, 8, 7, 9, 11, 10, 13]}
        />
        <div className="min-w-[200px] flex-1">
          <KpiCard
            label="New customers"
            value="248"
            icon={Users}
            badge={{ text: "+8%", positive: true }}
            sparkline={[3, 4, 3, 5, 6, 5, 7]}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <KpiCard
            label="Orders"
            value="1'042"
            icon={ShoppingCart}
            sub="12 kunden warten"
            subTone="warn"
            sparkline={[9, 7, 8, 6, 7, 5, 6]}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <KpiCard label="Conversion" value="3.4 %" loading />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard label="Open tasks" value="5" variant="mini" icon={ClipboardCheck} href="#tasks" />
        <KpiCard
          label="Overdue"
          value="2"
          variant="mini"
          sub="since 3 days"
          subTone="danger"
          sparkline={[1, 2, 2, 3, 2]}
        />
        <KpiCard label="Won" value="18" variant="mini" badge={{ text: "+3", positive: true }} />
        <KpiCard label="Churn" value="1.1 %" variant="mini" subTone="warn" sub="above goal" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[260px] flex-1">
          <KpiCard
            label="Revenue by channel"
            variant="donut"
            centerValue="1.2M"
            segments={[
              { label: "Direct", value: 52 },
              { label: "Partners", value: 31 },
              { label: "Online", value: 17 },
            ]}
          />
        </div>
        <div className="min-w-[260px] flex-1">
          <KpiCard
            label="Pipeline stage"
            variant="donut"
            sub="34 open deals"
            segments={[
              { label: "Won", value: 18 },
              { label: "Negotiation", value: 9 },
              { label: "Lost", value: 7 },
            ]}
          />
        </div>
        <div className="min-w-[260px] flex-1">
          <KpiCard label="Team load" variant="donut" loading />
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


// Fake "model" call: the components take a promise, so a consuming app can
// wire any backend behind them -- this demo just delays and rewrites locally.
async function fakeModel(text: string): Promise<string> {
  await sleep(900);
  const cleaned = text.trim().replace(/\s+/g, " ");
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}${/[.!?]$/.test(cleaned) ? "" : "."}`;
}

function AiActionsDemo(): ReactElement {
  const [summarizing, setSummarizing] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <AiButton tone="solid">Generate description</AiButton>
        <AiButton tone="subtle" icon={Wand2}>
          Rewrite
        </AiButton>
        <AiButton tone="ghost" icon={BookOpen}>
          Suggest tags
        </AiButton>
        <AiButton
          tone="solid"
          loading={summarizing}
          onClick={() => {
            setSummarizing(true);
            void sleep(1200).then(() => setSummarizing(false));
          }}
        >
          Summarize (click me)
        </AiButton>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border p-4">
        <div>
          <p className="text-2xl font-semibold">CHF 2.4M</p>
          <p className="text-xs text-muted-foreground">Revenue, last 30 days</p>
        </div>
        <AiExplainButton
          title="Why is revenue up?"
          onExplain={async () => {
            await sleep(800);
            return (
              <>
                <p>Revenue is 18% above the previous 30 days, driven by:</p>
                <ul className="mt-2 list-disc pl-4">
                  <li>Two Q4 framework renewals (CHF 310k combined)</li>
                  <li>Higher average order value in the insulation category</li>
                </ul>
              </>
            );
          }}
        />
      </div>
    </div>
  );
}

function VoiceDemo(): ReactElement {
  const [note, setNote] = useState(
    "customer called about the insulation order they want two extra pallets delivered to the sion site before friday",
  );
  const [quick, setQuick] = useState("");

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          VoiceInputButton — dictation next to any field, via the browser's built-in speech
          recognition (disabled where the browser has none).
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={quick}
            onChange={(event) => setQuick(event.target.value)}
            placeholder="Customer note…"
          />
          <VoiceInputButton onTranscript={(text) => setQuick((v) => (v ? `${v} ${text}` : text))} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          VoiceTranscript — dictate, edit the transcript, then hand it to a model and undo if the
          rewrite isn't better.
        </p>
        <VoiceTranscript value={note} onChange={setNote} onTransform={fakeModel} />
      </div>
    </div>
  );
}

function CheckboxSwitchDemo(): ReactElement {
  const [terms, setTerms] = useState(true);
  const [notifications, setNotifications] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="terms"
          checked={terms}
          onCheckedChange={(checked) => setTerms(checked === true)}
        />
        <Label htmlFor="terms">Include archived orders</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="terms-disabled" disabled />
        <Label htmlFor="terms-disabled" className="text-muted-foreground">
          Disabled
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="notify" checked={notifications} onCheckedChange={setNotifications} />
        <Label htmlFor="notify">Email me when a sync fails</Label>
      </div>
    </div>
  );
}

// `SidebarNav` on its own -- the same scroll-fade nav area `Sidebar` uses
// internally, for a mobile drawer that doesn't want the rest of the chrome.
function SidebarNavDemo(): ReactElement {
  const isWide = useMediaQuery("(min-width: 768px)");

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        useMediaQuery(&quot;(min-width: 768px)&quot;) → {String(isWide)}
      </p>
      <div className="h-40 w-56 overflow-hidden rounded-lg border border-border">
        <SidebarNav>
          <NavGroup label="Work">
            <NavItem icon={LayoutGrid} label="Overview" active />
            <NavItem icon={ClipboardCheck} label="Approvals" />
            <NavItem icon={Users} label="Customers" />
            <NavItem icon={ShoppingCart} label="Orders" />
            <NavItem icon={DollarSign} label="Invoices" />
            <NavItem icon={Cog} label="Settings" />
          </NavGroup>
        </SidebarNav>
      </div>
      <CollapsedStateReadout />
    </div>
  );
}

// Outside any <Sidebar>, the context falls back to its default -- which is
// exactly what a consuming app's own nav row sees when it's rendered in a
// drawer rather than the rail.
function CollapsedStateReadout(): ReactElement {
  const collapsed = useSidebarCollapsed();
  return (
    <p className="text-xs text-muted-foreground">useSidebarCollapsed() → {String(collapsed)}</p>
  );
}
