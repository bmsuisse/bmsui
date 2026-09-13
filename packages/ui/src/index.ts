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

// --- patterns (composed on top of the primitives above) ---------------------
export type { ModalProps } from "./patterns/modal/Modal";
export { Modal } from "./patterns/modal/Modal";
export type { ConfirmDialogProps } from "./patterns/modal/ConfirmDialog";
export { ConfirmDialog } from "./patterns/modal/ConfirmDialog";
export type { FormModalProps } from "./patterns/modal/FormModal";
export { FormModal } from "./patterns/modal/FormModal";
export type { ResponsivePanelProps, ResponsivePanelSize } from "./patterns/modal/ResponsivePanel";
export { ResponsivePanel } from "./patterns/modal/ResponsivePanel";

export type { FormFieldProps } from "./patterns/form-field/FormField";
export { FormField } from "./patterns/form-field/FormField";

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

export type { SearchBarProps } from "./patterns/search-bar/SearchBar";
export { SearchBar, searchInputKeyboardProps } from "./patterns/search-bar/SearchBar";

export type { DonutSegment, KpiCardProps } from "./patterns/kpi-card/KpiCard";
export { DonutChart, KpiCard, Sparkline } from "./patterns/kpi-card/KpiCard";

export type { SearchPanelMode, SearchPanelProps } from "./patterns/search-panel/SearchPanel";
export { SearchPanel } from "./patterns/search-panel/SearchPanel";
export type { SearchTriggerProps } from "./patterns/search-panel/SearchTrigger";
export { SearchTrigger } from "./patterns/search-panel/SearchTrigger";
export type { SearchOverlayProps } from "./patterns/search-panel/SearchOverlay";
export { SearchOverlay } from "./patterns/search-panel/SearchOverlay";

export type { ToastContextValue, ToastPosition, ToastProviderProps } from "./patterns/toast/ToastProvider";
export { ToastProvider } from "./patterns/toast/ToastProvider";
export type {
  ToastAction,
  ToastOptions,
  ToastRecord,
  ToastVariant,
} from "./patterns/toast/toast-store";
export type { PromiseToastMessages, ToastApi } from "./patterns/toast/useToast";
export { useToast } from "./patterns/toast/useToast";

export type { StepperProps, StepperStep } from "./patterns/stepper/Stepper";
export { Stepper } from "./patterns/stepper/Stepper";

export type { EmptyStateAction, EmptyStateProps, EmptyStateVariant } from "./patterns/empty-state/EmptyState";
export { EmptyState } from "./patterns/empty-state/EmptyState";

export type { AiMarkerProps } from "./patterns/ai/AiMarker";
export { AiMarker } from "./patterns/ai/AiMarker";
export type { ConfidenceBand, ConfidenceIndicatorProps } from "./patterns/ai/ConfidenceIndicator";
export {
  ConfidenceIndicator,
  DEFAULT_CONFIDENCE_THRESHOLDS,
  resolveConfidenceBand,
} from "./patterns/ai/ConfidenceIndicator";
export type { AiSuggestionProps, AiSuggestionStatus } from "./patterns/ai/AiSuggestion";
export { AiSuggestion } from "./patterns/ai/AiSuggestion";
export type {
  AiActivityProps,
  AiActivityStep,
  AiActivityStepStatus,
} from "./patterns/ai/AiActivity";
export { AiActivity } from "./patterns/ai/AiActivity";

export type { ActionButtonProps, ActionItem } from "./patterns/action-button/ActionButton";
export { ActionButton } from "./patterns/action-button/ActionButton";
export type { ActionSheetLabels, ActionSheetProps } from "./patterns/action-button/ActionSheet";
export { ActionSheet } from "./patterns/action-button/ActionSheet";

export type { NotificationBellProps } from "./patterns/notification-center/NotificationBell";
export { NotificationBell } from "./patterns/notification-center/NotificationBell";
export type {
  NotificationAction,
  NotificationCardProps,
} from "./patterns/notification-center/NotificationCard";
export { NotificationCard } from "./patterns/notification-center/NotificationCard";
export type { NotificationPanelProps } from "./patterns/notification-center/NotificationPanel";
export { NotificationPanel } from "./patterns/notification-center/NotificationPanel";
export type {
  NotificationBannerApi,
  NotificationBannerContextValue,
  NotificationBannerHostProps,
} from "./patterns/notification-center/NotificationBanner";
export {
  NotificationBannerHost,
  useNotificationBanner,
} from "./patterns/notification-center/NotificationBanner";
export type {
  NotificationBannerOptions,
  NotificationBannerRecord,
} from "./patterns/notification-center/notification-banner-store";

export type {
  ChatMessageProps,
  ChatMessageRole,
  ChatMessageSkeletonProps,
} from "./patterns/chat/ChatMessage";
export { ChatMessage, ChatMessageSkeleton } from "./patterns/chat/ChatMessage";
export type { Suggestion, SuggestionChipsProps } from "./patterns/chat/SuggestionChips";
export { SuggestionChips } from "./patterns/chat/SuggestionChips";
export type { ChoiceBlockProps, ChoiceOption } from "./patterns/chat/ChoiceBlock";
export { ChoiceBlock } from "./patterns/chat/ChoiceBlock";
export type {
  ChatComposerInputProps,
  ChatComposerProps,
  ChatSendButtonProps,
} from "./patterns/chat/ChatComposer";
export { ChatComposer, ChatComposerInput, ChatSendButton } from "./patterns/chat/ChatComposer";
export type { ScrollToBottomButtonProps } from "./patterns/chat/ScrollToBottomButton";
export { ScrollToBottomButton } from "./patterns/chat/ScrollToBottomButton";
export type { FileAttachmentChipProps } from "./patterns/file-upload/FileAttachmentChip";
export { FileAttachmentChip } from "./patterns/file-upload/FileAttachmentChip";
export type { FileDropzoneProps } from "./patterns/file-upload/FileDropzone";
export { FileDropzone } from "./patterns/file-upload/FileDropzone";

export type { NavIconProps, NavItemProps } from "./patterns/sidebar/NavItem";
export { NavItem } from "./patterns/sidebar/NavItem";
export type { NavGroupProps } from "./patterns/sidebar/NavGroup";
export { NavGroup } from "./patterns/sidebar/NavGroup";
export type { SidebarNavProps, SidebarProps } from "./patterns/sidebar/Sidebar";
export { Sidebar, SidebarNav } from "./patterns/sidebar/Sidebar";
export { useSidebarCollapsed } from "./patterns/sidebar/context";

// --- shared utility -----------------------------------------------------------
export { cn } from "./lib/utils";
export { useMediaQuery } from "./lib/useMediaQuery";
export { useVisualViewportHeight } from "./lib/useVisualViewportHeight";
export { useKeyboardOffset } from "./lib/useKeyboardOffset";
export type { FileDropzoneHandlers } from "./lib/useFileDropzone";
export { useFileDropzone } from "./lib/useFileDropzone";
