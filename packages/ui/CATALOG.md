# @bmsuisse/ui catalog

One line per export: what it is and when to reach for it. Written for coding
agents and people in consuming apps: **check here before building a local
component** — if it's listed, import it from `@bmsuisse/ui` instead.

Shipped in the npm package (`node_modules/@bmsuisse/ui/CATALOG.md`). Every
runtime export of `src/index.ts` must appear here; `tests/catalog.test.ts`
fails otherwise. Longer docs and examples: `docs-site/docs/ui/` and the
repo's `AGENTS.md`.

## Primitives (shadcn/ui on Radix)

| Export | Use for |
| --- | --- |
| `Button`, `buttonVariants` | Every button. Variants `default` `secondary` `outline` `ghost` `destructive` `link` `ai*`; sizes `xs` `sm` `default` `lg` `icon*`. |
| `Input` | Single-line text input. For dates use `DateInput`; for search use `SearchBar`. |
| `Textarea` | Multi-line text. |
| `Label` | Form label. Prefer `FormField`, which wires label + error + ids. |
| `Checkbox`, `Switch` | Boolean inputs. |
| `Select`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectTrigger`, `SelectValue` | Short fixed option list without search. With search use `Combobox`. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Bordered content block. |
| `Badge`, `badgeVariants` | Small label. For statuses use `StatusBadge`. |
| `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter` | Low-level dialog. Usually use `Modal` / `FormModal` / `ConfirmDialog` / `ResponsivePanel` instead. |
| `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetBody`, `SheetFooter`, `SheetClose`, `SheetPortal`, `sheetVariants` | Side or bottom drawer. |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` | Floating panel anchored to a trigger. |
| `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | Hover/focus hint text. |
| `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` | Action menus ("⋯" menus, row actions). |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Switching between views of one page. |
| `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | Static HTML table. For sorting/filtering/paging data use `@bmsuisse/datagrid`. |
| `Separator` | Horizontal/vertical rule. |
| `ScrollArea`, `ScrollBar` | Styled scroll container. |
| `Skeleton` | Loading placeholder block. |

## Dialogs

| Export | Use for |
| --- | --- |
| `Modal` | Generic dialog: title, description, body, footer. |
| `FormModal` | Dialog wrapping a form; does **not** auto-close on submit (server validation). |
| `ConfirmDialog` | "Are you sure?"; closes itself after a successful confirm. |
| `QuestionDialog` | Question with several actions + Cancel ("Save changes before closing?"). |
| `DialogActions` | Buttons in the platform's order (Cancel right on Windows, left elsewhere). |
| `ResponsivePanel` | Large dialog on desktop, bottom sheet on phones. Prefer over `Modal` for long forms/lists. |

## Forms and inputs

| Export | Use for |
| --- | --- |
| `FormField` | Label + control + error/description with ids wired. Wrap every form control. |
| `DateInput`, `defaultDateInputLabels` | Day field in the app locale (dd.mm.yyyy), ISO value, `min`/`max`, calendar button, native `<input type="date">` on touch devices. Instead of `<input type="date">`. |
| `parseIsoDay`, `formatIsoDay`, `shiftIsoDay`, `datePlaceholder`, `toLocalIsoDay` | Date helpers. `toLocalIsoDay(new Date())` instead of `toISOString().slice(0, 10)` (UTC day bug). |
| `Combobox` | Searchable dropdown, single or `multiple`. |
| `TagCombobox` | Multi-select with chips inline in the field. |
| `ButtonGroup` | Connected single-select segment buttons. |
| `SearchBar` | Pill search input with clear button; caller renders results. |
| `SearchPanel`, `SearchTrigger` | Bordered search card with mode pills; icon button that opens a search overlay. |
| `Stepper` | Numbered wizard progress. |

## Feedback and states

| Export | Use for |
| --- | --- |
| `AsyncBoundary` | Loading → error → empty → content switch for fetched data. Start here for any query-backed view. |
| `EmptyState` | "Nothing here" with icon, title, description, action. |
| `FilteredEmptyState`, `defaultFilteredEmptyStateLabels` | "No results" with a Reset filters button. |
| `ErrorState`, `InlineError`, `defaultErrorStateLabels`, `toErrorInfo` | Load failure: block or one-line, with Retry. |
| `LoadingState`, `RefreshBar`, `useDelayedFlag` | Initial-load placeholder; thin bar for refetch; delay flag to avoid spinner flash. |
| `LoadingSpinner`, `LoadingOverlay`, `loadingSpinnerIconVariants` | Inline spinner; centered overlay spinner. |
| `toast`, `Toaster`, `defaultToasterLabels`, `MAX_TOASTS`, `resetToasts` | Brief notices (`toast.success("Saved")`). Mount `<Toaster />` once. `resetToasts()` clears the queue between tests. |
| `AlertBox` | Inline error/warning/info/success banner. |
| `StatusBadge` | Status string → colored badge. |

## Data display

| Export | Use for |
| --- | --- |
| `KpiCard`, `Sparkline`, `DonutChart` | KPI tile with trend sparkline or donut. |

## Navigation and shell

| Export | Use for |
| --- | --- |
| `Sidebar`, `SidebarNav`, `NavGroup`, `NavItem`, `useSidebarCollapsed` | App left navigation, resizable and rail-collapsible. |
| `AnimatedBrand`, `BRAND_ANIMATIONS` | One* product wordmark with optional intro animation. |

## AI

| Export | Use for |
| --- | --- |
| `AiButton` | "Do it with AI" button with in-flight state. |
| `AiExplainButton` | Sparkle button that opens a popover with a lazily generated explanation. |
| `VoiceInputButton`, `VoiceTranscript`, `useSpeechRecognition`, `describeSpeechError` | Dictation button; dictate-then-rewrite workflow; the hook underneath. |

## Utilities

| Export | Use for |
| --- | --- |
| `cn` | `clsx` + `tailwind-merge` class joiner. |
| `useMediaQuery` | Reactive media query. |
| `getConfirmButtonPlacement`, `isWindowsPlatform` | Platform-dependent button order. |
