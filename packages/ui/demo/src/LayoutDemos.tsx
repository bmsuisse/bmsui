import {
  Breadcrumbs,
  Button,
  type CommandItem,
  CommandPalette,
  CommandPaletteTrigger,
  CommandRegistryProvider,
  PageHeader,
  Pagination,
  SplitPane,
  SplitPanePanel,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePage,
  TableResultCount,
  TableRow,
  TableSearch,
  TableToolbar,
  Tabs,
  TabsList,
  TabsTrigger,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  toast,
  useCommandPaletteHotkey,
  useRecentCommands,
  useRegisterCommands,
} from "@bmsuisse/ui";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  BoldIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  DocumentPlusIcon,
  FunnelIcon,
  HomeIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  MoonIcon,
  PlusIcon,
  PrinterIcon,
  ShareIcon,
  StrikethroughIcon,
  TrashIcon,
  UnderlineIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";

export function PageHeaderDemo(): ReactElement {
  return (
    <div data-testid="demo-page-header" className="flex w-full flex-col gap-8">
      <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
        <PageHeader
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: "Home", href: "#", icon: HomeIcon },
                { label: "Customers", href: "#" },
                { label: "Region West", href: "#" },
                { label: "Zürich", href: "#" },
                { label: "Müller Haustechnik AG" },
              ]}
            />
          }
          onBack={() => toast("Back")}
          title="Müller Haustechnik AG"
          badge="beta"
          description="Key account since 2014 · 3 open offers · last visit 2 weeks ago"
          actions={
            <>
              <Button variant="outline" size="sm">
                <ShareIcon /> Share
              </Button>
              <Button size="sm">
                <PlusIcon /> New offer
              </Button>
            </>
          }
          tabs={
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="offers">Offers</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
      </div>
      <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
        <PageHeader title="Reports" badge="alpha" description="Sales KPIs per region and month." divider />
      </div>
      <Breadcrumbs
        data-testid="demo-breadcrumbs-short"
        items={[{ label: "Settings", href: "#" }, { label: "Users", href: "#" }, { label: "Jane Doe" }]}
      />
    </div>
  );
}

const ROWS = [
  { id: "OF-2026-0312", customer: "Müller Haustechnik AG", owner: "D. Peter", status: "approved", total: "CHF 48'120" },
  { id: "OF-2026-0311", customer: "Baumann Sanitär GmbH", owner: "S. Keller", status: "pending", total: "CHF 12'940" },
  { id: "OF-2026-0310", customer: "Graf Bad & Küche", owner: "D. Peter", status: "draft", total: "CHF 7'310" },
  { id: "OF-2026-0309", customer: "Steiner Bau AG", owner: "M. Frei", status: "rejected", total: "CHF 91'500" },
  { id: "OF-2026-0308", customer: "Huber Installationen", owner: "S. Keller", status: "approved", total: "CHF 3'480" },
  { id: "OF-2026-0307", customer: "Zürcher Wohnbau", owner: "M. Frei", status: "pending", total: "CHF 22'075" },
];

export function TablePageDemo(): ReactElement {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(3);
  const [pageSize, setPageSize] = useState(25);
  const rows = ROWS.filter((r) => `${r.id} ${r.customer}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div data-testid="demo-table-page" className="h-[34rem] w-full">
      <TablePage
        title="Offers"
        description="All offers of your team, newest first."
        actions={
          <>
            <Button variant="outline" size="sm">
              <ArrowDownTrayIcon /> Export
            </Button>
            <Button size="sm">
              <PlusIcon /> New offer
            </Button>
          </>
        }
        toolbar={
          <TableToolbar
            search={<TableSearch value={query} onChange={setQuery} placeholder="Search offers…" aria-label="Search offers" />}
            filters={
              <>
                <Button variant="outline" size="sm" className="rounded-full">
                  <FunnelIcon /> Status
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  Owner
                </Button>
              </>
            }
            actions={
              <Button variant="ghost" size="icon-sm" aria-label="Refresh">
                <ArrowPathIcon />
              </Button>
            }
          />
        }
        meta={<TableResultCount shown={rows.length === ROWS.length ? 312 : rows.length} total={312} />}
        footer={
          <Pagination
            page={page}
            onPageChange={setPage}
            totalItems={312}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            className="text-xs"
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Offer</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="max-sm:hidden">Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.concat(rows).map((r, i) => (
              <TableRow key={`${r.id}-${i}`} className="border-border">
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell>{r.customer}</TableCell>
                <TableCell className="max-sm:hidden">{r.owner}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TablePage>
    </div>
  );
}

export function PaginationDemo(): ReactElement {
  const [a, setA] = useState(1);
  const [b, setB] = useState(7);
  const [c, setC] = useState(3);
  return (
    <div data-testid="demo-pagination" className="flex w-full flex-col gap-5">
      <Pagination page={a} onPageChange={setA} pageCount={5} />
      <Pagination page={b} onPageChange={setB} totalItems={312} pageSize={25} />
      <Pagination page={c} onPageChange={setC} totalItems={312} pageSize={25} compact />
    </div>
  );
}

function PageCommands(): null {
  const commands = useMemo<CommandItem[]>(
    () => [
      { id: "page-duplicate", group: "This offer", label: "Duplicate offer", icon: DocumentDuplicateIcon, shortcut: ["⌘", "D"], onSelect: () => toast("Duplicated") },
      { id: "page-print", group: "This offer", label: "Print offer", icon: PrinterIcon, shortcut: ["⌘", "P"], onSelect: () => toast("Printing…") },
      { id: "page-delete", group: "This offer", label: "Delete offer", icon: TrashIcon, disabled: "Approved offers are locked", onSelect: () => {} },
    ],
    [],
  );
  useRegisterCommands(commands);
  return null;
}

export function CommandPaletteDemo(): ReactElement {
  const [open, setOpen] = useState(false);
  const { recent, push } = useRecentCommands("demo");
  useCommandPaletteHotkey(() => setOpen((o) => !o));
  const commands = useMemo<CommandItem[]>(
    () => [
      { id: "new-offer", group: "Create", label: "New offer", icon: DocumentPlusIcon, shortcut: ["⌘", "N"], keywords: ["angebot", "offerte"], onSelect: () => toast("New offer") },
      { id: "new-contact", group: "Create", label: "New contact", icon: UserPlusIcon, keywords: ["kontakt", "person"], onSelect: () => toast("New contact") },
      { id: "go-customers", group: "Go to", label: "Customers", icon: UserGroupIcon, shortcut: "G C", onSelect: () => toast("Customers") },
      { id: "go-reports", group: "Go to", label: "Reports", icon: ChartBarIcon, shortcut: "G R", keywords: ["kpi", "dashboard"], onSelect: () => toast("Reports") },
      { id: "go-settings", group: "Go to", label: "Settings", icon: Cog6ToothIcon, shortcut: ["⌘", ","], onSelect: () => toast("Settings") },
      { id: "toggle-dark", group: "Preferences", label: "Toggle dark mode", icon: MoonIcon, keywords: ["theme", "night"], onSelect: () => document.documentElement.classList.toggle("dark") },
    ],
    [],
  );
  return (
    <CommandRegistryProvider>
      <PageCommands />
      <div data-testid="demo-command-palette" className="flex flex-wrap items-center gap-3">
        <CommandPaletteTrigger onClick={() => setOpen(true)} />
        <span className="text-sm text-muted-foreground">or press ⌘K / Ctrl+K</span>
        <CommandPalette
          open={open}
          onOpenChange={setOpen}
          commands={commands}
          recent={recent}
          onCommandRun={push}
          groupOrder={["Create", "This offer", "Go to", "Preferences"]}
        />
      </div>
    </CommandRegistryProvider>
  );
}

export function SplitPaneDemo(): ReactElement {
  return (
    <div data-testid="demo-split-pane" className="flex w-full flex-col gap-4">
      <div className="h-56 w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <SplitPane defaultSizes={[32, 68]} storageKey="demo-master-detail">
          <SplitPanePanel minSize="160px" maxSize={60} className="flex flex-col gap-1 p-2">
            {ROWS.map((r, i) => (
              <div
                key={r.id}
                className={
                  i === 0
                    ? "rounded-md bg-foreground/[0.06] px-2.5 py-1.5 text-sm font-medium"
                    : "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground"
                }
              >
                {r.customer}
              </div>
            ))}
          </SplitPanePanel>
          <SplitPanePanel minSize="240px" className="flex flex-col gap-2 p-4">
            <p className="text-sm font-semibold">Müller Haustechnik AG</p>
            <p className="text-sm text-muted-foreground">
              Drag the separator, or focus it with Tab and use the arrow keys (Shift for bigger steps, Home/End for the
              limits, double-click to reset). The layout is remembered in localStorage.
            </p>
          </SplitPanePanel>
        </SplitPane>
      </div>
      <div className="h-56 w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <SplitPane direction="vertical" defaultSizes={[60, 40]}>
          <div className="p-4 text-sm">Editor</div>
          <div className="h-full bg-muted/50 p-4 font-mono text-xs text-muted-foreground">$ build output…</div>
        </SplitPane>
      </div>
    </div>
  );
}

export function ToolbarDemo(): ReactElement {
  const [marks, setMarks] = useState<Record<string, boolean>>({ bold: true });
  const toggle = (key: string) => () => setMarks((m) => ({ ...m, [key]: !m[key] }));
  return (
    <div data-testid="demo-toolbar" className="flex w-full flex-col gap-4">
      <Toolbar aria-label="Text formatting" className="w-fit">
        <ToolbarButton label="Undo" icon={ArrowUturnLeftIcon} />
        <ToolbarButton label="Redo" icon={ArrowUturnRightIcon} disabled />
        <ToolbarSeparator />
        <ToolbarButton label="Bold" icon={BoldIcon} pressed={!!marks.bold} onClick={toggle("bold")} />
        <ToolbarButton label="Italic" icon={ItalicIcon} pressed={!!marks.italic} onClick={toggle("italic")} />
        <ToolbarButton label="Underline" icon={UnderlineIcon} pressed={!!marks.underline} onClick={toggle("underline")} />
        <ToolbarButton label="Strikethrough" icon={StrikethroughIcon} pressed={!!marks.strike} onClick={toggle("strike")} />
        <ToolbarSeparator />
        <ToolbarButton label="Bulleted list" icon={ListBulletIcon} />
        <ToolbarButton label="Align left" icon={Bars3BottomLeftIcon} />
        <ToolbarButton label="Link" icon={LinkIcon} />
      </Toolbar>
      <div className="w-full max-w-[22rem] resize-x overflow-hidden" data-testid="demo-toolbar-overflow">
        <Toolbar aria-label="Offer actions" overflow>
          <ToolbarButton label="Duplicate" icon={DocumentDuplicateIcon} showLabel />
          <ToolbarButton label="Print" icon={PrinterIcon} showLabel />
          <ToolbarSeparator />
          <ToolbarButton label="Share" icon={ShareIcon} showLabel />
          <ToolbarButton label="Export" icon={ArrowDownTrayIcon} showLabel />
          <ToolbarButton label="Delete" icon={TrashIcon} showLabel />
        </Toolbar>
      </div>
      <Toolbar aria-label="View" variant="ghost">
        <ToolbarButton label="List" icon={Bars3Icon} pressed showLabel />
        <ToolbarButton label="Chart" icon={ChartBarIcon} pressed={false} showLabel />
      </Toolbar>
    </div>
  );
}
