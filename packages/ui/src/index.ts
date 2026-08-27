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

export type { FormFieldProps } from "./patterns/form-field/FormField";
export { FormField } from "./patterns/form-field/FormField";

export type {
  ComboboxMultiProps,
  ComboboxOption,
  ComboboxProps,
  ComboboxSingleProps,
} from "./patterns/combobox/Combobox";
export { Combobox } from "./patterns/combobox/Combobox";

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
export { SearchBar } from "./patterns/search-bar/SearchBar";

// --- shared utility -----------------------------------------------------------
export { cn } from "./lib/utils";
