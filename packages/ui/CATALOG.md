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
| `Input` | Single-line text input. For dates use `DateInput`; numbers `NumberInput`; search `SearchBar`; icons/units around it `InputGroup`. |
| `Textarea` | Multi-line text. |
| `Label` | Form label. Prefer `FormField`, which wires label + error + ids. |
| `Checkbox`, `Switch` | Boolean inputs. |
| `RadioGroup`, `RadioGroupItem` | Radix radio group + circle, for your own layout. With labels/descriptions use `RadioList`. |
| `Slider` | Radix slider, one thumb per value (`[50]`, `[10, 80]`); `thumbLabels`, `getValueText`. Range with typed bounds: `RangeSlider`. |
| `Select`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectTrigger`, `SelectValue` | Short fixed option list without search. With search use `Combobox`. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Bordered content block. |
| `Badge`, `badgeVariants` | Small label. For statuses use `StatusBadge`. |
| `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter` | Low-level dialog. Usually use `Modal` / `FormModal` / `ConfirmDialog` / `ResponsivePanel` instead. |
| `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetBody`, `SheetFooter`, `SheetClose`, `SheetPortal`, `sheetVariants` | Side or bottom drawer. |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` | Floating panel anchored to a trigger. |
| `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | Hover/focus hint text. |
| `HoverCard`, `HoverCardTrigger`, `HoverCardContent` | Rich preview on hover (contact card, linked record). Mouse-only extra; never the only path to info. Click-to-open → `Popover`. |
| `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` | Bare show/hide region. For a titled foldable section use `CollapsibleSection`. |
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
| `DateInput`, `defaultDateInputLabels` | Day field in the app locale (dd.mm.yyyy), ISO value, `min`/`max`, `isDateDisabled`, calendar button (`picker="calendar"` for the app-styled lazy `Calendar`), native `<input type="date">` on touch devices. Instead of `<input type="date">`. |
| `parseIsoDay`, `formatIsoDay`, `shiftIsoDay`, `datePlaceholder`, `toLocalIsoDay` | Date helpers. `toLocalIsoDay(new Date())` instead of `toISOString().slice(0, 10)` (UTC day bug). |
| `DateRangePicker`, `defaultDateRangePickerLabels` | "from – to" day fields in one box + range calendar popover; native inputs on touch. Period filters, validity ranges. |
| `Calendar`, `defaultCalendarLabels` | Always-visible month grid, `mode` single or `range`, min/max, keyboard nav, locale week start. ISO days. |
| `NumberInput`, `defaultNumberInputLabels` | Locale number field (`1’234.50`, reads `1234,5`), commit on blur/Enter, min/max clamp, ArrowUp/Down, optional `stepper`. Instead of `type="number"`. |
| `parseLocaleNumber`, `formatLocaleNumber` | The number parse/format behind `NumberInput`, for use outside the field. |
| `InputGroup`, `InputGroupAddon`, `InputGroupInput`, `InputGroupButton` | Input with leading/trailing icon, unit text (`CHF`) or small buttons; one border + focus ring. |
| `SegmentedControl` | Compact 2–5 option view/mode switch with sliding thumb; radiogroup + arrow keys. |
| `RadioList` | Radio options with label + description, plain or `variant="card"`. |
| `RangeSlider`, `defaultRangeSliderLabels` | Two-thumb numeric range with typed min/max inputs (price/area filters). |
| `FileInput`, `defaultFileInputLabels`, `formatFileSize`, `matchesAccept` | Drop zone + click to browse, `accept`/`maxSize`/`maxFiles` errors, removable file list. Controlled `files`. |
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
| `ErrorState`, `InlineError`, `defaultErrorStateLabels`, `toErrorInfo`, `RetryButtonProps` | Load failure: block or one-line, with Retry; `retryProps` adds a test id or a taller tap target to the button. |
| `LoadingState`, `RefreshBar`, `useDelayedFlag` | Initial-load placeholder; thin bar for refetch; delay flag to avoid spinner flash. |
| `LoadingSpinner`, `LoadingOverlay`, `loadingSpinnerIconVariants` | Inline spinner; centered overlay spinner. |
| `toast`, `Toaster`, `defaultToasterLabels`, `MAX_TOASTS`, `resetToasts` | Brief notices (`toast.success("Saved")`). Mount `<Toaster />` once. `resetToasts()` clears the queue between tests. |
| `AlertBox` | Inline error/warning/info/success banner. |
| `StatusBadge` | Status string → colored badge. |
| `StatusDot` | Quiet status: colored dot + label (table cells, presence). Same tones/vocabulary as `StatusBadge`. |
| `ProgressBar`, `CircularProgress` | Determinate or indeterminate progress (`role=progressbar`) with label, value, tones. Ring for tight spots. |

## Data display

| Export | Use for |
| --- | --- |
| `KpiCard`, `Sparkline`, `DonutChart` | KPI tile with trend sparkline or donut. |
| `MetadataList`, `defaultMetadataListLabels` | Label/value pairs on detail pages (`<dl>`): stacked or label column, responsive columns, copy buttons, "—" for empty. |
| `Timestamp` | `<time>` with relative text ("vor 5 Min.", live) and the full date in a tooltip; or `date`/`datetime`/`time`. |
| `formatRelativeTime` | Relative time string outside a component (de-CH default via `Intl.RelativeTimeFormat`). |
| `Avatar`, `getInitials`, `avatarColorIndex` | Person/company picture with initials fallback in a stable color, optional status dot. |
| `AvatarGroup`, `defaultAvatarGroupLabels` | Overlapping avatars with "+N" overflow whose tooltip lists the rest. |
| `CollapsibleSection` | Foldable titled section with chevron, count pill, actions, smooth height. |
| `Kbd` | A single keycap. |
| `KeyCombo`, `formatKey`, `defaultKeyComboLabels` | Shortcut as keycaps per platform: `Mod+K` → "⌘ K" / "Ctrl K"; sequences ("g o"). |
| `ShortcutSheet`, `defaultShortcutSheetLabels` | The "?" dialog listing all shortcuts in groups. |

## Navigation and shell

| Export | Use for |
| --- | --- |
| `Sidebar`, `SidebarNav`, `NavGroup`, `NavItem`, `useSidebarCollapsed` | App left navigation, resizable and rail-collapsible. |
| `PageHeader`, `defaultPageHeaderLabels` | Top of every page: breadcrumbs, back arrow, title + badge, description, actions (wrap on phones), tabs row. Same props as OneSales's `ui/PageHeader`. |
| `Breadcrumbs`, `defaultBreadcrumbsLabels` | Where-am-I trail (`nav` > `ol`, current page last); collapses the middle into a "…" menu past `maxItems`. `renderLink` for router links. |
| `TablePage` | Whole table/list page: `PageHeader` + `TableShell` filling the remaining height. Start here for any list page. |
| `TableShell`, `TableToolbar`, `TableSearch`, `TableResultCount`, `defaultTableResultCountLabels` | Panel around a table/grid: toolbar (search, filters, actions) → meta strip ("12 of 48") → body → footer. Wrap a `@bmsuisse/datagrid` grid or a `Table`. |
| `Pagination`, `getPageRange`, `defaultPaginationLabels` | Server-side paging: prev/next, page numbers with "…", rows-per-page select, "1–25 of 312"; prev / "3 / 13" / next on phones. |
| `CommandPalette`, `CommandPaletteTrigger`, `useCommandPaletteHotkey`, `useRecentCommands`, `formatCommandPaletteShortcut`, `defaultCommandPaletteLabels`, `scoreCommand` | ⌘K / Ctrl+K "do anything" dialog: grouped commands with icons and shortcut hints, fuzzy-ish filter, recent commands, keyboard navigation. Trigger = top-bar search pill. |
| `CommandRegistryProvider`, `useRegisterCommands`, `useRegisteredCommands` | Let pages add their own commands to the app-wide `CommandPalette` while mounted. |
| `SplitPane`, `SplitPanePanel`, `defaultSplitPaneLabels` | Two or more panes with draggable, keyboard-operable separators (master/detail, editor/preview); min/max in % or px; `storageKey` remembers the layout. Not for the app nav (use `Sidebar resizable`). |
| `Toolbar`, `ToolbarButton`, `ToolbarSeparator`, `defaultToolbarLabels` | Row of related controls as one Tab stop (roving tabindex, arrow keys); toggle buttons; `overflow` folds `ToolbarButton`s that don't fit into a "…" menu (other children stay visible). |
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
| `isMacPlatform` | Apple platform check (⌘ vs Ctrl spelling). |

## Hooks

| Export | Use for |
| --- | --- |
| `useHotkeys` | Keyboard shortcuts: `useHotkeys([{ keys: "mod+k", handler }])`. `mod` = ⌘/Ctrl, chords (`"g i"`), skips inputs unless `allowInInputs`, `enabled`, `preventDefault`. |
| `formatHotkey` | Shortcut label for the platform: `formatHotkey("mod+k")` → `⌘K` / `Ctrl+K`. Use in menus, tooltips, `DropdownMenuShortcut`. |
| `useClipboard` | Copy button: `{ copy, copied, error, reset }`; `copied` resets after `timeout`; falls back without `navigator.clipboard`. |
| `useAnnounce` | Screen-reader announcement: `announce("3 results", { politeness })` through a shared hidden live region. |
| `announce` | Same as `useAnnounce()`'s function, callable outside React (stores, query callbacks). |
| `Announcer` | Optional in-tree live regions; mount inside a modal so announcements aren't hidden by it. |
| `useMergedRefs` | One callback ref from several refs (own ref + forwarded ref). |
| `useFocusTrap` | Keep Tab focus inside a custom overlay/panel and restore it on close. Radix `Dialog`/`Sheet` already trap. |
| `useLongPress` | Press-and-hold (touch/mouse/pen) with threshold and move-cancel; spread handlers on the element. |
| `useScrollOverflow` | `{ ref, top, bottom, left, right }` overflow flags for fade edges on a scroll container. |
| `useLocalStorageState` | `useState` persisted in `localStorage`: SSR-safe, never throws, synced across hooks and tabs. |

## Search results and filters

| Export | Use when |
|---|---|
| `ScoreBadge`, `RankBadge`, `defaultScoreThresholds`, `resolveScoreTone` | Match/confidence score as a tinted "92%" pill (`max={1}` for 0–1 scores, custom `thresholds`); `RankBadge` is the numbered square for ranked lists. For a status word use `StatusBadge`. |
| `FacetFilter`, `FacetFilterSkeleton`, `FacetGroup`, `countActiveFacets`, `defaultFacetFilterLabels`, `formatFacetRange`, `parseFacetRange` | Faceted-search sidebar: checkbox options with result counts, show-more, switch rows (`type: "boolean"`), radio facets (`type: "single"`), numeric ranges with optional histogram (`type: "range"`) and date ranges (`type: "dateRange"`) stored as one `"low..high"` entry, fold-away headings (`collapsible`), per-facet Clear and search (`searchable`); `FacetFilterSkeleton` while loading. Controlled `{ [facetKey]: values[] }`. One dropdown filter → `Combobox`. |
| `ActiveFacets`, `defaultActiveFacetsLabels` | Applied facet filters as removable chips + "Clear all" above a result list; same `facets`/`value` as `FacetFilter`. |
| `FilterSheet`, `FilterSheetTrigger`, `defaultFilterSheetLabels` | Filters in a bottom sheet on phones / dialog on desktop with Reset/Apply and an active-count button. Holds no draft state. |
| `ResultCard`, `ResultList`, `Thumbnail` | Search hit row/card (thumbnail, title, meta, trailing price/score) as one native button or link inside a `ResultList`. Tabular data → datagrid. |
