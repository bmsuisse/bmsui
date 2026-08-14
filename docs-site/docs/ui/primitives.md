---
title: Primitives
---

# Primitives

Base, shadcn/ui-based components that every pattern in this package (and
your own app-specific components) is built on top of. Each is a thin,
typed wrapper — same API shape you'd get generating the component via the
shadcn/ui CLI, just pre-built and versioned as a dependency instead of
copy-pasted into your repo.

| Component | Notes |
| --- | --- |
| `Button` | Variants: `default`, `outline`, `secondary`, `link`, `destructive`, `ghost`. Sizes: `default`, `sm`, `lg`, `xs`, `icon`, `icon-sm`, `icon-lg`, `icon-xs`. Icons render at a consistent `size-4` automatically when passed as a bare child. |
| `Input` / `Textarea` / `Label` | Standard form fields, styled to match `border-input`/`ring` focus tokens. |
| `Card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. |
| `Badge` | Variants: `default`, `secondary`, `destructive`, `outline`, `warning`. |
| `Dialog` | `Dialog`, `DialogContent` (with an opt-out `showCloseButton` and a built-in `max-h-[85vh] overflow-y-auto` safety net for tall content), `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogTrigger`. |
| `Popover` | `Popover`, `PopoverTrigger`, `PopoverContent`. |
| `Select` | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`. |
| `Skeleton` | Loading placeholder block. |
| `DropdownMenu` | Full Radix feature set: `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`/`DropdownMenuRadioGroup`, submenus, `DropdownMenuShortcut`. |
| `Sheet` | Slide-in panel (`SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`). Its slide transition uses a plain `transition-transform` toggle rather than `tailwindcss-animate`, so it works without that plugin installed. |
| `Tooltip` | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`. |

See the [interactive demo](https://bmsuisse.github.io/bmsui/demo/ui/) for every one of these rendered
together, or the exported TypeScript types (`import type { ... } from
"@bmsuisse/ui"`) for exact prop signatures.
