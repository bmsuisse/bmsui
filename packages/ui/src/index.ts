// Public entry point for @bmsuisse/ui.

// --- primitives (shadcn/ui-based) -------------------------------------------
export type { ButtonProps } from "./primitives/button";
export { Button, buttonVariants } from "./primitives/button";
export type { InputProps } from "./primitives/input";
export { Input } from "./primitives/input";
export { Label } from "./primitives/label";
export type { TextareaProps } from "./primitives/textarea";
export { Textarea } from "./primitives/textarea";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./primitives/card";
export type { BadgeProps } from "./primitives/badge";
export { Badge, badgeVariants } from "./primitives/badge";
export {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./primitives/dialog";
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./primitives/popover";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./primitives/select";
export { Skeleton } from "./primitives/skeleton";
export { Checkbox } from "./primitives/checkbox";
export type { SwitchProps } from "./primitives/switch";
export { Switch } from "./primitives/switch";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./primitives/tabs";
export { Separator } from "./primitives/separator";
export { ScrollArea, ScrollBar } from "./primitives/scroll-area";
export type { SelectTriggerProps } from "./primitives/select";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./primitives/table";
export {
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
} from "./primitives/dropdown-menu";
export type { SheetContentProps } from "./primitives/sheet";
export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
  sheetVariants,
} from "./primitives/sheet";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./primitives/tooltip";
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./primitives/collapsible";
export { HoverCard, HoverCardContent, HoverCardTrigger } from "./primitives/hover-card";
export { RadioGroup, RadioGroupItem } from "./primitives/radio-group";
export type { SliderProps } from "./primitives/slider";
export { Slider } from "./primitives/slider";

// --- patterns (composed on top of the primitives above) ---------------------
export type { ModalProps } from "./patterns/modal/Modal";
export { Modal } from "./patterns/modal/Modal";
export type { ConfirmDialogProps } from "./patterns/modal/ConfirmDialog";
export { ConfirmDialog } from "./patterns/modal/ConfirmDialog";
export type { DialogActionsProps } from "./patterns/modal/DialogActions";
export { DialogActions } from "./patterns/modal/DialogActions";
export type { FormModalProps } from "./patterns/modal/FormModal";
export { FormModal } from "./patterns/modal/FormModal";
export type { ResponsivePanelProps, ResponsivePanelSize } from "./patterns/modal/ResponsivePanel";
export { ResponsivePanel } from "./patterns/modal/ResponsivePanel";
export type { QuestionDialogAction, QuestionDialogProps } from "./patterns/modal/QuestionDialog";
export { QuestionDialog } from "./patterns/modal/QuestionDialog";

export type { FormFieldProps } from "./patterns/form-field/FormField";
export { FormField } from "./patterns/form-field/FormField";

export type { GridColumn as ComboboxColumn } from "./lib/optionGrid";

export type {
  ComboboxMultiProps,
  ComboboxOption,
  ComboboxProps,
  ComboboxSingleProps,
} from "./patterns/combobox/Combobox";
export { Combobox } from "./patterns/combobox/Combobox";

export type { TagComboboxOption, TagComboboxProps } from "./patterns/tag-combobox/TagCombobox";
export { TagCombobox } from "./patterns/tag-combobox/TagCombobox";

export type { AlertBoxProps, AlertBoxVariant } from "./patterns/alert-box/AlertBox";
export { AlertBox } from "./patterns/alert-box/AlertBox";

export type { StatusBadgeProps, StatusTone } from "./patterns/status-badge/StatusBadge";
export { StatusBadge } from "./patterns/status-badge/StatusBadge";

export type { ButtonGroupOption, ButtonGroupProps } from "./patterns/button-group/ButtonGroup";
export { ButtonGroup } from "./patterns/button-group/ButtonGroup";

export type {
  LoadingOverlayProps,
  LoadingSpinnerProps,
} from "./patterns/loading-spinner/LoadingSpinner";
export {
  LoadingOverlay,
  LoadingSpinner,
  loadingSpinnerIconVariants,
} from "./patterns/loading-spinner/LoadingSpinner";

export type { LoadingStateProps } from "./patterns/loading-spinner/LoadingState";
export { LoadingState, RefreshBar, useDelayedFlag } from "./patterns/loading-spinner/LoadingState";
export type { ErrorInfo, ErrorInput } from "./lib/errorState";
export { toErrorInfo } from "./lib/errorState";
export type {
  ErrorStateLabels,
  ErrorStateProps,
  RetryButtonProps,
  InlineErrorProps,
} from "./patterns/error-state/ErrorState";
export { defaultErrorStateLabels, ErrorState, InlineError } from "./patterns/error-state/ErrorState";
export type { AsyncBoundaryProps } from "./patterns/async-boundary/AsyncBoundary";
export { AsyncBoundary } from "./patterns/async-boundary/AsyncBoundary";

export type { SearchBarProps } from "./patterns/search-bar/SearchBar";
export { SearchBar } from "./patterns/search-bar/SearchBar";

export type { DonutSegment, KpiCardProps } from "./patterns/kpi-card/KpiCard";
export { DonutChart, KpiCard, Sparkline } from "./patterns/kpi-card/KpiCard";

export type { SearchPanelMode, SearchPanelProps } from "./patterns/search-panel/SearchPanel";
export { SearchPanel } from "./patterns/search-panel/SearchPanel";
export type { SearchTriggerProps } from "./patterns/search-panel/SearchTrigger";
export { SearchTrigger } from "./patterns/search-panel/SearchTrigger";

export type { NavIconProps, NavItemProps } from "./patterns/sidebar/NavItem";
export { NavItem } from "./patterns/sidebar/NavItem";
export type { NavGroupProps } from "./patterns/sidebar/NavGroup";
export { NavGroup } from "./patterns/sidebar/NavGroup";
export type { SidebarNavProps, SidebarProps } from "./patterns/sidebar/Sidebar";
export { Sidebar, SidebarNav } from "./patterns/sidebar/Sidebar";
export { useSidebarCollapsed } from "./patterns/sidebar/context";

export type { AiButtonProps, AiButtonVariant } from "./patterns/ai/AiButton";
export { AiButton } from "./patterns/ai/AiButton";
export type { AiExplainButtonProps } from "./patterns/ai/AiExplainButton";
export { AiExplainButton } from "./patterns/ai/AiExplainButton";
export type { VoiceInputButtonProps } from "./patterns/ai/VoiceInputButton";
export { VoiceInputButton } from "./patterns/ai/VoiceInputButton";
export type { VoiceTranscriptProps } from "./patterns/ai/VoiceTranscript";
export { VoiceTranscript } from "./patterns/ai/VoiceTranscript";
export type {
  SpeechRecognitionEngine,
  SpeechRecognitionEngineFactory,
  SpeechRecognitionState,
  UseSpeechRecognitionOptions,
} from "./patterns/ai/useSpeechRecognition";
export { describeSpeechError, useSpeechRecognition } from "./patterns/ai/useSpeechRecognition";
export type { StepperProps, StepperStep } from "./patterns/stepper/Stepper";
export { Stepper } from "./patterns/stepper/Stepper";

export type {
  EmptyStateProps,
  FilteredEmptyStateLabels,
  FilteredEmptyStateProps,
} from "./patterns/empty-state/EmptyState";
export { defaultFilteredEmptyStateLabels, EmptyState, FilteredEmptyState } from "./patterns/empty-state/EmptyState";

export type { ToastAction, ToastItem, ToastOptions, ToastTone } from "./patterns/toast/toastStore";
export { MAX_TOASTS, resetToasts, toast } from "./patterns/toast/toastStore";
export type { ToasterLabels, ToasterPosition, ToasterProps } from "./patterns/toast/Toaster";
export { defaultToasterLabels, Toaster } from "./patterns/toast/Toaster";

export type { DateInputError, DateInputLabels, DateInputProps } from "./patterns/date-input/DateInput";
export { DateInput, defaultDateInputLabels } from "./patterns/date-input/DateInput";
export { datePlaceholder, formatIsoDay, parseIsoDay, shiftIsoDay, toLocalIsoDay } from "./lib/dateField";

export type { MetadataItem, MetadataListLabels, MetadataListProps } from "./patterns/metadata-list/MetadataList";
export { defaultMetadataListLabels, MetadataList } from "./patterns/metadata-list/MetadataList";

export type { CircularProgressProps, ProgressBarProps, ProgressTone } from "./patterns/progress/ProgressBar";
export { CircularProgress, ProgressBar } from "./patterns/progress/ProgressBar";

export type { TimestampFormat, TimestampProps } from "./patterns/timestamp/Timestamp";
export { Timestamp } from "./patterns/timestamp/Timestamp";
export type { RelativeTimeStyle } from "./patterns/timestamp/formatRelativeTime";
export { formatRelativeTime } from "./patterns/timestamp/formatRelativeTime";

export type { KbdProps, KeyComboLabels, KeyComboProps } from "./patterns/kbd/Kbd";
export { defaultKeyComboLabels, formatKey, Kbd, KeyCombo } from "./patterns/kbd/Kbd";
export type { Shortcut, ShortcutGroup, ShortcutSheetLabels, ShortcutSheetProps } from "./patterns/kbd/ShortcutSheet";
export { defaultShortcutSheetLabels, ShortcutSheet } from "./patterns/kbd/ShortcutSheet";

export type {
  AvatarGroupItem,
  AvatarGroupLabels,
  AvatarGroupProps,
  AvatarProps,
  AvatarSize,
} from "./patterns/avatar/Avatar";
export { Avatar, AvatarGroup, avatarColorIndex, defaultAvatarGroupLabels, getInitials } from "./patterns/avatar/Avatar";

export type { CollapsibleSectionProps } from "./patterns/collapsible-section/CollapsibleSection";
export { CollapsibleSection } from "./patterns/collapsible-section/CollapsibleSection";

export type { StatusDotProps } from "./patterns/status-dot/StatusDot";
export { StatusDot } from "./patterns/status-dot/StatusDot";
export type { BreadcrumbItem, BreadcrumbLinkRenderProps, BreadcrumbsLabels, BreadcrumbsProps } from "./patterns/breadcrumbs/Breadcrumbs";
export { Breadcrumbs, defaultBreadcrumbsLabels } from "./patterns/breadcrumbs/Breadcrumbs";

export type { PageHeaderBadge, PageHeaderLabels, PageHeaderProps } from "./patterns/page-header/PageHeader";
export { defaultPageHeaderLabels, PageHeader } from "./patterns/page-header/PageHeader";

export type {
  TablePageProps,
  TableResultCountLabels,
  TableResultCountProps,
  TableSearchProps,
  TableShellProps,
  TableToolbarProps,
} from "./patterns/table-shell/TableShell";
export {
  defaultTableResultCountLabels,
  TablePage,
  TableResultCount,
  TableSearch,
  TableShell,
  TableToolbar,
} from "./patterns/table-shell/TableShell";

export type { PageRangeItem, PaginationLabels, PaginationProps } from "./patterns/pagination/Pagination";
export { defaultPaginationLabels, getPageRange, Pagination } from "./patterns/pagination/Pagination";

export type { CommandItem } from "./patterns/command-palette/types";
export type {
  CommandPaletteLabels,
  CommandPaletteProps,
  CommandPaletteTriggerProps,
  UseCommandPaletteHotkeyOptions,
} from "./patterns/command-palette/CommandPalette";
export {
  CommandPalette,
  CommandPaletteTrigger,
  defaultCommandPaletteLabels,
  formatCommandPaletteShortcut,
  useCommandPaletteHotkey,
  useRecentCommands,
} from "./patterns/command-palette/CommandPalette";
export { scoreCommand } from "./patterns/command-palette/commandFilter";
export {
  CommandRegistryProvider,
  useRegisterCommands,
  useRegisteredCommands,
} from "./patterns/command-palette/registry";

export type {
  SplitPaneLabels,
  SplitPaneLimit,
  SplitPanePanelProps,
  SplitPaneProps,
} from "./patterns/split-pane/SplitPane";
export { defaultSplitPaneLabels, SplitPane, SplitPanePanel } from "./patterns/split-pane/SplitPane";

export type { ToolbarButtonProps, ToolbarLabels, ToolbarProps } from "./patterns/toolbar/Toolbar";
export { defaultToolbarLabels, Toolbar, ToolbarButton, ToolbarSeparator } from "./patterns/toolbar/Toolbar";
export type {
  CalendarLabels,
  CalendarProps,
  CalendarRangeProps,
  CalendarSingleProps,
  DateRange,
} from "./patterns/calendar/Calendar";
export { Calendar, defaultCalendarLabels } from "./patterns/calendar/Calendar";
export type { DateRangePickerLabels, DateRangePickerProps } from "./patterns/date-range-picker/DateRangePicker";
export { DateRangePicker, defaultDateRangePickerLabels } from "./patterns/date-range-picker/DateRangePicker";

export type { NumberInputLabels, NumberInputProps } from "./patterns/number-input/NumberInput";
export { defaultNumberInputLabels, NumberInput } from "./patterns/number-input/NumberInput";
export type { FormatNumberOptions } from "./lib/numberField";
export { formatLocaleNumber, parseLocaleNumber } from "./lib/numberField";

export type { InputGroupProps } from "./patterns/input-group/InputGroup";
export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./patterns/input-group/InputGroup";

export type {
  SegmentedControlOption,
  SegmentedControlProps,
} from "./patterns/segmented-control/SegmentedControl";
export { SegmentedControl } from "./patterns/segmented-control/SegmentedControl";

export type { RadioListOption, RadioListProps } from "./patterns/radio-list/RadioList";
export { RadioList } from "./patterns/radio-list/RadioList";

export type { RangeSliderLabels, RangeSliderProps } from "./patterns/range-slider/RangeSlider";
export { defaultRangeSliderLabels, RangeSlider } from "./patterns/range-slider/RangeSlider";

export type { FileInputLabels, FileInputProps, FileRejection } from "./patterns/file-input/FileInput";
export { defaultFileInputLabels, FileInput, formatFileSize, matchesAccept } from "./patterns/file-input/FileInput";

// --- shared utility -----------------------------------------------------------
export { cn } from "./lib/utils";
export { useMediaQuery } from "./lib/useMediaQuery";
export type { ConfirmButtonPlacement } from "./lib/platform";
export { getConfirmButtonPlacement, isMacPlatform, isWindowsPlatform } from "./lib/platform";

export type { AnimatedBrandProps } from "./patterns/animated-brand/AnimatedBrand";
export { AnimatedBrand } from "./patterns/animated-brand/AnimatedBrand";
export type { BrandAnimation, BrandMode } from "./patterns/animated-brand/brandMotion";
export { BRAND_ANIMATIONS } from "./patterns/animated-brand/brandMotion";

// --- hooks --------------------------------------------------------------------
export type { Hotkey, UseHotkeysOptions } from "./hooks/useHotkeys";
export { formatHotkey, useHotkeys } from "./hooks/useHotkeys";
export type { UseClipboardOptions, UseClipboardResult } from "./hooks/useClipboard";
export { useClipboard } from "./hooks/useClipboard";
export type { AnnounceOptions, AnnouncePoliteness } from "./hooks/useAnnounce";
export { announce, Announcer, useAnnounce } from "./hooks/useAnnounce";
export { useMergedRefs } from "./hooks/useMergedRefs";
export type { UseFocusTrapOptions } from "./hooks/useFocusTrap";
export { useFocusTrap } from "./hooks/useFocusTrap";
export type { LongPressHandlers, UseLongPressOptions } from "./hooks/useLongPress";
export { useLongPress } from "./hooks/useLongPress";
export type { ScrollOverflow, UseScrollOverflowResult } from "./hooks/useScrollOverflow";
export { useScrollOverflow } from "./hooks/useScrollOverflow";
export type { SetLocalStorageState, UseLocalStorageStateOptions } from "./hooks/useLocalStorageState";
export { useLocalStorageState } from "./hooks/useLocalStorageState";

export type { ScoreBadgeProps, ScoreThreshold, RankBadgeProps } from "./patterns/score-badge/ScoreBadge";
export { ScoreBadge, RankBadge, defaultScoreThresholds, resolveScoreTone } from "./patterns/score-badge/ScoreBadge";
export type {
  FacetDefinition,
  FacetFilterLabels,
  FacetFilterProps,
  FacetFilterValue,
  FacetGroupProps,
  FacetOption,
} from "./patterns/facet-filter/FacetFilter";
export { FacetFilter, FacetGroup, countActiveFacets, defaultFacetFilterLabels } from "./patterns/facet-filter/FacetFilter";
export type {
  FilterSheetLabels,
  FilterSheetProps,
  FilterSheetTriggerProps,
} from "./patterns/filter-sheet/FilterSheet";
export { FilterSheet, FilterSheetTrigger, defaultFilterSheetLabels } from "./patterns/filter-sheet/FilterSheet";
export type { ResultCardProps, ResultListProps, ThumbnailProps } from "./patterns/result-card/ResultCard";
export { ResultCard, ResultList, Thumbnail } from "./patterns/result-card/ResultCard";
