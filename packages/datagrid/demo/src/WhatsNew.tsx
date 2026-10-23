import type { ReactElement, ReactNode } from "react";
import { FilterBarDemo, OrgTreeDemo, PersistedColumnsDemo, RowStylingDemo } from "./App";

interface Change {
  id: string;
  title: string;
  before: string;
  now: string;
  tryThis: string[];
  demo: ReactNode;
}

const CHANGES: Change[] = [
  {
    id: "widths",
    title: "1 · Column widths that stick",
    before:
      "Dragging a column edge in a box wider than the table spread the spare space over every column, so the edge didn't follow the mouse. Widths were lost on reload, and there was no way back to the defaults.",
    now: "The edge follows the pointer, widths and hidden columns survive a reload, and one button resets both.",
    tryThis: [
      "Drag the right edge of “Category”: it moves exactly with the mouse.",
      "Hide a column via “Table layout”, then reload the page: both changes are still there.",
      "“Table layout” → “Reset columns”: everything is back to the defaults.",
    ],
    demo: <PersistedColumnsDemo />,
  },
  {
    id: "filters",
    title: "2 · Filters you can see and share",
    before:
      "A checklist filter listed every option from the column definition, without counts, and could only include. There was no overview of the active filters, and a reload lost them.",
    now: "Checklists show only values the other filters leave, with counts, and can exclude. Active filters appear as chips. The URL keeps the filter.",
    tryThis: [
      "Filter Region to “EMEA”, then open Carrier: only carriers that still have rows are listed, each with a count.",
      "In Carrier, switch to “is none of” and tick “DHL”.",
      "Remove a chip with ×, or use “Clear all filters”: the table doesn't jump.",
      "Reload the page: the same filters come back from the URL.",
    ],
    demo: <FilterBarDemo />,
  },
  {
    id: "tree",
    title: "3 · Sorting and filtering in the tree",
    before: "The tree grid had no sorting and no filtering at all.",
    now: "Sort and filter from the column header, like the flat grid. A match deep in the tree shows with its parents opened.",
    tryThis: [
      "Click the “Name” header: every level is sorted.",
      "Expand Engineering → Frontend Team (only loaded rows are searched), then filter Name with “Alice”.",
    ],
    demo: <OrgTreeDemo />,
  },
  {
    id: "rows",
    title: "4 · Row and column styling",
    before:
      "A background colour set on a row disappeared on every other row (the zebra stripe won), there was no built-in highlighted row, column tints needed CSS hacks, and the tree height had to be a pixel number.",
    now: "Row colours win over the stripe, one row can be highlighted, columns take their own classes, and the tree can fill its box.",
    tryThis: [
      "Click rows 1 and 2 (or Tab to a row and press Enter): the highlight looks the same on both.",
      "The “Weight (kg)” column is tinted by one prop.",
      "The tree on the right fills its 20rem box and scrolls inside it.",
    ],
    demo: <RowStylingDemo />,
  },
];

function Callout({ label, tone, children }: { label: string; tone: string; children: ReactNode }): ReactElement {
  return (
    <div className="rounded-md border px-3 py-2 text-sm">
      <span className={`font-semibold ${tone}`}>{label} </span>
      {children}
    </div>
  );
}

/** One focused page with only what 0.42.0 changed: before, now, and what to click. Open with `?whats-new`. */
export function WhatsNew(): ReactElement {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-xl font-semibold">@bmsuisse/datagrid 0.42.0 — what changed</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Four improvements ported from MDMApp's Taxonomy Manager. Each card says what was wrong, what's
        better, and what to click to see it. <a className="underline" href="?">Full demo</a>
      </p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        {CHANGES.map((change) => (
          <a key={change.id} href={`#${change.id}`} className="rounded-full border px-3 py-1 hover:bg-accent">
            {change.title}
          </a>
        ))}
      </nav>
      {CHANGES.map((change) => (
        <section key={change.id} id={change.id} className="mt-8 scroll-mt-4 rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">{change.title}</h2>
          <div className="mb-3 grid gap-2 md:grid-cols-2">
            <Callout label="Before:" tone="text-red-700 dark:text-red-300">
              {change.before}
            </Callout>
            <Callout label="Now:" tone="text-emerald-700 dark:text-emerald-300">
              {change.now}
            </Callout>
          </div>
          <div className="mb-4 text-sm">
            <span className="font-semibold">Try this:</span>
            <ol className="mt-1 list-decimal pl-5 text-muted-foreground">
              {change.tryThis.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          {change.demo}
        </section>
      ))}
    </div>
  );
}
