# @bmsuisse/ui catalog

One line per export: what it is and when to reach for it. Written for coding
agents and people in consuming apps: **check here before building a local
component** — if it's listed, import it from `@bmsuisse/ui` instead.

Shipped in the npm package (`node_modules/@bmsuisse/ui/CATALOG.md`). Every
runtime export of `src/index.ts` must appear here; `tests/catalog.test.ts`
fails otherwise. Longer docs and examples: `docs-site/docs/ui/` and the
repo's `AGENTS.md`.

## Translations

| Export | Use for |
| --- | --- |
| `BmsLocaleProvider` | Sets the language of every built-in text once (`de`, `fr`, `it`, `en`, `nl`, `es`; `"de-CH"` works). `labels` props and text props still win. Without it everything stays English. |
| `useIntegratedI18n` | `{ locale, language, t }` of the active locale, e.g. to translate your own strings with the built-in catalog or to pick a date format. |
| `useFormatLocale` | The BCP 47 tag for number/date formatting: a component's `locale` prop, else the provider's, else `de-CH`. |
| `LANGUAGES`, `resolveLanguage`, `formatMessage` | The supported languages, a tag -> language lookup (fallback `en`), and the `{placeholder}`/plural formatter. |

## Primitives (shadcn/ui on Base UI, Radix-compatible API)

| Export | Use for |
| --- | --- |
| `Button`, `buttonVariants` | Every button. Variants `default` `secondary` `outline` `ghost` `destructive` `link` `ai*`; sizes `xs` `sm` `default` `lg` `icon*`. |
| `Input` | Single-line text input. For dates use `DateInput`; numbers `NumberInput`; search `SearchBar`; icons/units around it `InputGroup`. |
| `Textarea` | Multi-line text. |
| `Link`, `linkVariants`, `defaultLinkLabels` | Text link: `variant` default/subtle/inline, `asChild` for a router link, `external` (new tab, safe `rel`, icon, screen-reader hint). Instead of a hand-styled `<a>`; for a button-looking link use `Button asChild`. |
| `Label` | Form label. Prefer `FormField`, which wires label + error + ids. |
| `Checkbox`, `Switch` | Boolean inputs. |
| `RadioGroup`, `RadioGroupItem` | Radio group + circle, for your own layout. With labels/descriptions use `RadioList`. |
| `Slider` | Slider, one thumb per value (`[50]`, `[10, 80]`); `thumbLabels`, `getValueText`. Range with typed bounds: `RangeSlider`. |
| `Select`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectTrigger`, `SelectValue` | Short fixed option list without search. With search use `Combobox`. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Bordered content block. |
| `Badge`, `badgeVariants` | Small label. For statuses use `StatusBadge`. |
| `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter` | Low-level dialog. Usually use `Modal` / `FormModal` / `ConfirmDialog` / `ResponsivePanel` instead. |
| `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetBody`, `SheetFooter`, `SheetClose`, `SheetPortal`, `sheetVariants` | Side or bottom drawer. |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` | Floating panel anchored to a trigger. |
| `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | Hover/focus hint text. |
| `HoverCard`, `HoverCardTrigger`, `HoverCardContent` | Rich preview on hover (contact card, linked record). Mouse-only extra; never the only path to info. Click-to-open → `Popover`. |
| `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` | Bare show/hide region. For a titled foldable section use `CollapsibleSection`. |
| `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioGroup`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuGroup`, `ContextMenuPortal`, `ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent` | Right-click / long-press menu on rows and cards, same look as `DropdownMenu` (`danger` item too). Always also offer the actions through a visible "⋯" `DropdownMenu`. |
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
| `ConfirmPopover`, `defaultConfirmPopoverLabels` | In-page confirm next to a risky button (no modal): message, Keep/Confirm, focus on the safe action, async-aware. |
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
| `TimeInput`, `defaultTimeInputLabels` | Time-of-day field in the app clock (`14:30`, `en-US` 12 h), `HH:mm` value, accepts `9`/`930`/`9.30`, `min`/`max`, ArrowUp/Down by `step` minutes, native `<input type="time">` on touch. Instead of `<input type="time">`. |
| `DateTimeInput`, `defaultDateTimeInputLabels` | Date + time in one box with a calendar popover; value is a local ISO `yyyy-mm-ddTHH:mm`, `min`/`max` datetimes. Instead of `<input type="datetime-local">`. |
| `parseTime`, `formatTime`, `toTime`, `shiftTime`, `timePlaceholder` | Time helpers behind `TimeInput`, for use outside the field. |
| `PhoneInput` | `tel` field that reformats a Swiss number (`079…`, `0041…`, `+41…`) to `+41 79 123 45 67` on blur; other numbers stay as typed. Wrap in `FormField`. |
| `formatSwissPhone`, `normalizePhone` | The phone normalisation behind `PhoneInput` (Swiss-only vs. any number), for display and import code. |
| `Rating`, `defaultRatingLabels` | Star rating: radiogroup with arrow keys and hover preview, `allowHalf`, `readOnly` average display, `max`, `size`. Not a score badge (`ScoreBadge`) or a progress bar. |
| `parseIsoDay`, `formatIsoDay`, `shiftIsoDay`, `datePlaceholder`, `toLocalIsoDay`, `toLocalIsoDateTime` | Date helpers. `toLocalIsoDay(new Date())` instead of `toISOString().slice(0, 10)` (UTC day bug); `toLocalIsoDateTime` likewise for `DateTimeInput` values. |
| `DateRangePicker`, `defaultDateRangePickerLabels` | "from – to" day fields in one box + range calendar popover; native inputs on touch. Period filters, validity ranges. |
| `Calendar`, `defaultCalendarLabels` | Always-visible month grid, `mode` single or `range`, min/max, keyboard nav, locale week start. ISO days. |
| `NumberInput`, `defaultNumberInputLabels` | Locale number field (`1’234.50`, reads `1234,5`), commit on blur/Enter, min/max clamp, ArrowUp/Down, optional `stepper`. Instead of `type="number"`. |
| `parseLocaleNumber`, `formatLocaleNumber` | The number parse/format behind `NumberInput`, for use outside the field. |
| `InputGroup`, `InputGroupAddon`, `InputGroupInput`, `InputGroupButton` | Input with leading/trailing icon, unit text (`CHF`) or small buttons; one border + focus ring. |
| `SegmentedControl` | Compact 2–5 option view/mode switch with sliding thumb; radiogroup + arrow keys. |
| `RadioList` | Radio options with label + description, plain or `variant="card"`. |
| `RangeSlider`, `defaultRangeSliderLabels` | Two-thumb numeric range with typed min/max inputs (price/area filters). |
| `FileInput`, `defaultFileInputLabels`, `formatFileSize`, `matchesAccept` | Drop zone + click to browse, `accept`/`maxSize`/`maxFiles` errors, removable file list. Controlled `files`. |
| `TreeSelect` | Searchable single selection from an expandable hierarchy; keyboard navigation, parent selection, and display of saved values outside the available choices. |
| `TreeView`, `defaultTreeViewLabels` | Always-visible tree (file/category/org browser): single or multiple selection or tri-state `checkable`, lazy `onLoadChildren` with loading + retry row, WAI-ARIA keyboard + typeahead, `renderNode`. Not a dropdown: to pick one value in a form use `TreeSelect`; for a tree with columns use `TreeDataGrid`. |
| `Combobox` | Searchable dropdown, single or `multiple`; `searchable={false}` drops the search box for a short list; `fitContent` lets the popup grow and wrap so long labels stay readable (the trigger always shows the full selection as its title). |
| `TagCombobox` | Multi-select with chips inline in the field. |
| `ButtonGroup` | Connected single-select segment buttons. |
| `EmailAddressInput`, `isValidEmail`, `parseEmailAddresses`, `defaultEmailAddressInputLabels` | To/Cc/Bcc field: addresses become chips (Enter/comma/semicolon/space/Tab/blur, paste splits lists and `Name <a@b.ch>`), invalid ones stay as red chips, optional `suggestions`. Not `TagCombobox` (fixed option list). |
| `SplitButton` | Primary action + joined chevron menu ("Send" / "Send and close", "Send later"). Not `ButtonGroup` (that is single-select). |
| `ConversationRow`, `ConversationList`, `defaultConversationRowLabels` | Inbox/help-desk list row: customer, subject - preview, status, star, attachment, assignee, time, optional checkbox; whole row is a link/button, wraps to two lines on phones. Put rows in `ConversationList`. |
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
| `Chip`, `chipClass`, `defaultChipLabels` | Pill for a value the user picked: static, `selected`, toggle (`onClick`, `aria-pressed`) or removable (`onRemove`, x/Backspace). Not `Badge`/`StatusBadge` (static labels/statuses). |
| `UpdatePrompt`, `defaultUpdatePromptLabels` | PWA "new version available, reload" bar (a top `Banner`) with Later snooze, updating state and a `canReload` guard for unsaved work; first-time "ready offline" toast. Use with `registerType: "prompt"`. |
| `InstallPrompt`, `defaultInstallPromptLabels` | PWA install card or banner: native install dialog on Chrome/Edge/Android, "Share, Add to Home Screen" guide in iOS Safari. You decide when (`open`). |
| `OfflineIndicator`, `defaultOfflineIndicatorLabels` | The offline `Banner` plus "back online" toast, wired to `useOnlineStatus` (or your own `online` flag). |
| `Banner`, `BannerAction`, `defaultBannerLabels` | Slim full-width app-shell bar (offline, update available, impersonating, test env, session expired) with tone, actions, dismiss; live region stays mounted. Not `AlertBox` (inline in content). |
| `LiveIndicator`, `defaultLiveIndicatorLabels` | Pulsing dot + "Updated 14:02:11" for a polled page; fetching/paused states. |
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
| `StatStrip`, `StatStripItem` | One bordered row of label-over-value cells for dense admin metrics (flash on change, optional link/button cell). Lighter than `KpiCard`. |
| `Timeline`, `TimelineItem`, `TimelineGroup`, `defaultTimelineLabels` | Vertical rail of events or process steps (`<ol>`): marker per `status` (done/active/pending/error) or `tone`, title, `time` (via `Timestamp`), description, foldable detail, trailing `pending` loader, `TimelineGroup` date headers. Activity history, audit trail, running steps; not a wizard header (`Stepper`). |
| `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` | Several titled panels where one (`type="single"`) or many (`"multiple"`) are open: FAQ, settings groups. Several items under arrow-key navigation; for one standalone foldable section use `CollapsibleSection`. |
| `CollapsibleSection` | Foldable titled section with chevron, count pill, actions, smooth height. |
| `Kbd` | A single keycap. |
| `ToolCallCard`, `ToolCallGroup`, `defaultToolCallLabels`, `formatToolDuration` | One agent tool call (name, status icon, summary, duration, foldable input/output/error; open while running or failed, folds when done) and a "4 steps" fold for a run of them. Data in, no chat runtime. |
| `Reasoning`, `defaultReasoningLabels` | Collapsible "thinking" block of an assistant message: shimmering header and live-following text while `streaming`, "Thought for 4 s" once done. |
| `Citation`, `SourceList`, `getSourceDomain`, `defaultCitationLabels` | Numbered `[n]` chip inside generated text with title/domain tooltip, opens the source in a new tab (bare `[n]` when unknown); `SourceList` is the numbered list below the message. |
| `CodeBlock`, `defaultCodeBlockLabels` | Code/log snippet: language title, copy button, optional line numbers, wrap or scroll in `maxHeight`, `highlight` slot to inject shiki/prism. |
| `JsonView`, `defaultJsonViewLabels` | Collapsible pretty-printed JSON for API/tool payloads: key count, size, copy, scrolling body. Same frame as `CodeBlock`. |
| `TypingIndicator` | Three bouncing dots with a screen-reader label for "assistant is typing". |
| `KeyCombo`, `formatKey`, `defaultKeyComboLabels` | Shortcut as keycaps per platform: `Mod+K` → "⌘ K" / "Ctrl K"; sequences ("g o"). |
| `ShortcutSheet`, `defaultShortcutSheetLabels` | The "?" dialog listing all shortcuts in groups. |

## Navigation and shell

| Export | Use for |
| --- | --- |
| `Sidebar`, `SidebarNav`, `NavGroup`, `NavItem`, `useSidebarCollapsed` | App left navigation, resizable and rail-collapsible. |
| `BottomNavigation`, `BottomNavigationAction`, `defaultBottomNavigationLabels` | Phone tab bar: 2–5 icon + label destinations with badges, optional centre action, safe-area padding, `aria-current="page"`, `renderLink` for routers, `hideFrom="md"`. The phone counterpart of `Sidebar`. |
| `PageHeader`, `defaultPageHeaderLabels` | Top of every page: breadcrumbs, back arrow, title + badge, description, actions (wrap on phones), tabs row. Same props as OneSales's `ui/PageHeader`. |
| `Breadcrumbs`, `defaultBreadcrumbsLabels` | Where-am-I trail (`nav` > `ol`, current page last); collapses the middle into a "…" menu past `maxItems`. `renderLink` for router links. |
| `TablePage` | Whole table/list page: `PageHeader` + `TableShell` filling the remaining height. Start here for any list page. |
| `TableShell`, `TableToolbar`, `TableSearch`, `TableResultCount`, `defaultTableResultCountLabels` | Panel around a table/grid: toolbar (search, filters, actions) → meta strip ("12 of 48") → body → footer. Wrap a `@bmsuisse/datagrid` grid or a `Table`. |
| `Pagination`, `getPageRange`, `defaultPaginationLabels` | Server-side paging: prev/next, page numbers with "…", rows-per-page select, "1–25 of 312"; prev / "3 / 13" / next on phones. |
| `CommandPalette`, `CommandPaletteTrigger`, `useCommandPaletteHotkey`, `useRecentCommands`, `formatCommandPaletteShortcut`, `defaultCommandPaletteLabels`, `scoreCommand` | ⌘K / Ctrl+K "do anything" dialog: grouped commands with icons and shortcut hints, fuzzy-ish filter, recent commands, keyboard navigation. Trigger = top-bar search pill. |
| `CommandRegistryProvider`, `useRegisterCommands`, `useRegisteredCommands` | Let pages add their own commands to the app-wide `CommandPalette` while mounted. |
| `SplitPane`, `SplitPanePanel`, `defaultSplitPaneLabels` | Two or more panes with draggable, keyboard-operable separators (master/detail, editor/preview); min/max in % or px; `storageKey` remembers the layout. Not for the app nav (use `Sidebar resizable`). |
| `SkipLinks` | Hidden "skip to main content / search" links, visible on first Tab; mount first in the app root. |
| `CopyButton`, `defaultCopyButtonLabels` | Icon (or text) button that copies a value, flips to a check and announces the result. |
| `Toolbar`, `ToolbarButton`, `ToolbarSeparator`, `defaultToolbarLabels` | Row of related controls as one Tab stop (roving tabindex, arrow keys); toggle buttons; `overflow` folds `ToolbarButton`s that don't fit into a "…" menu (other children stay visible). |
| `AttachmentList`, `defaultAttachmentListLabels` | Files attached to a message: paperclip count, type icon or thumbnail, name, size, download link, `onRemove` in compose mode; `list` or `chips`. |
| `QuotedText`, `defaultQuotedTextLabels` | Folded quoted reply history behind a "…" pill (`aria-expanded`), hairline left border once open. |
| `MailMessage`, `defaultMailMessageLabels` | One mail thread entry: avatar, sender, to/cc line, time, status (draft/sending/failed/bounced + retry), body, attachments, folded quote, actions; `note` direction is amber. Caller sanitizes the body. |
| `MailEvent` | Centred muted thread line item between hairlines ("Anna assigned this to Bob"), with icon, time and tone. |
| `AnimatedBrand`, `BRAND_ANIMATIONS` | One* product wordmark with optional intro animation. |

## AI

| Export | Use for |
| --- | --- |
| `AiButton` | "Do it with AI" button with in-flight state. |
| `AiExplainButton` | Sparkle button that opens a popover with a lazily generated explanation. |
| `VoiceInputButton`, `VoiceTranscript`, `useSpeechRecognition`, `describeSpeechError` | Dictation button; dictate-then-rewrite workflow; the hook underneath. |
| `ChatMessage`, `defaultChatMessageLabels` | One chat turn: user bubble vs plain assistant text, avatar/name/time, sending/streaming/error status with retry, actions slot. Data in; you own streaming. |
| `ChatConversation`, `defaultChatConversationLabels` | Scrolling `role="log"` message list: sticks to the bottom while content streams in, "Jump to latest" when scrolled up, `onReachTop` for history paging, empty slot. |
| `PromptInput`, `defaultPromptInputLabels` | Chat composer: auto-growing field, Enter sends / Shift+Enter newline (IME-safe), Send becomes Stop while streaming, attachments/leading/actions slots. |
| `PromptSuggestions` | One scrolling row of suggested-prompt / follow-up pills with edge fades; `onSelect(prompt)`. |
| `ApprovalCard`, `defaultApprovalCardLabels` | Human-in-the-loop "allow this action?" card: details, Approve/Decline or pick-one choices, frozen outcome once decided. |
| `GuidedChoice`, `defaultGuidedChoiceLabels` | One step of a guided review ("which product is it?"): question, option cards with a suggested one, arrows or 1-9 to pick, Enter to confirm. Built on Base UI. For a frozen pick-one answer use `ApprovalCard`. |

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
| `useOnlineStatus` | `false` while the browser is offline (`online`/`offline` events), SSR-safe; drives an offline `Banner` (or just use `OfflineIndicator`). |
| `useStandaloneMode` | `true` while the app runs as an installed PWA (`display-mode: standalone` / iOS `navigator.standalone`). |
| `useServiceWorkerUpdate` | Headless "new version" state machine (`idle`/`available`/`updating`/`blocked`, snooze, `canReload` guard for unsaved work); you pass vite-plugin-pwa's `needRefresh`/`updateServiceWorker`. Ready-made bar: `UpdatePrompt`. |
| `useInstallPrompt`, `captureInstallPrompt` | PWA install state (`native`/`ios`/`none`, `canInstall`, `promptInstall`, "Not now" snooze). Call `captureInstallPrompt()` in the entry file before React renders. Ready-made UI: `InstallPrompt`. |
| `useClipboard` | Copy button: `{ copy, copied, error, reset }`; `copied` resets after `timeout`; falls back without `navigator.clipboard`. |
| `useAnnounce` | Screen-reader announcement: `announce("3 results", { politeness })` through a shared hidden live region. |
| `announce` | Same as `useAnnounce()`'s function, callable outside React (stores, query callbacks). |
| `Announcer` | Optional in-tree live regions; mount inside a modal so announcements aren't hidden by it. |
| `useMergedRefs` | One callback ref from several refs (own ref + forwarded ref). |
| `useFocusTrap` | Keep Tab focus inside a custom overlay/panel and restore it on close. `Dialog`/`Sheet` already trap. |
| `useLongPress` | Press-and-hold (touch/mouse/pen) with threshold and move-cancel; spread handlers on the element. |
| `useScrollOverflow` | `{ ref, top, bottom, left, right }` overflow flags for fade edges on a scroll container. |
| `useLocalStorageState` | `useState` persisted in `localStorage`: SSR-safe, never throws, synced across hooks and tabs. |

## Search results and filters

| Export | Use when |
|---|---|
| `ScoreBadge`, `RankBadge`, `defaultScoreThresholds`, `resolveScoreTone` | Match/confidence score as a tinted "92%" pill (`max={1}` for 0–1 scores, custom `thresholds`); `RankBadge` is the numbered square for ranked lists. For a status word use `StatusBadge`. |
| `FacetFilter`, `FacetFilterSkeleton`, `FacetGroup`, `countActiveFacets`, `defaultFacetFilterLabels`, `formatFacetRange`, `parseFacetRange` | Faceted-search sidebar: checkbox options with result counts, show-more, switch rows (`type: "boolean"`), radio facets (`type: "single"`), numeric ranges with optional histogram (`type: "range"`) and date ranges (`type: "dateRange"`) stored as one `"low..high"` entry, fold-away headings (`collapsible`), per-facet Clear and search (`searchable`, or `onSearchChange` for server-side search), `display: "dropdown"` (searchable `Combobox` for facets with many values), `hasMore`/`onLoadMore` ("Load more" for server-paged options); `FacetFilterSkeleton` while loading. Controlled `{ [facetKey]: values[] }`. One dropdown filter → `Combobox`. |
| `ActiveFacets`, `defaultActiveFacetsLabels` | Applied facet filters as removable chips + "Clear all" above a result list; same `facets`/`value` as `FacetFilter`. |
| `FilterSheet`, `FilterSheetTrigger`, `defaultFilterSheetLabels` | Filters in a bottom sheet on phones / dialog on desktop with Reset/Apply and an active-count button. Holds no draft state. |
| `ResultCard`, `ResultList`, `Thumbnail` | Search hit row/card (thumbnail, title, meta, trailing price/score) as one native button or link inside a `ResultList`. Tabular data → datagrid. |
