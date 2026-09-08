import { DataGrid, type ColumnDef } from "@bmsuisse/datagrid";
import { useState, type ReactElement } from "react";

interface Contact {
  id: string;
  name: string;
  customer: string;
  email: string;
}

const columns: ColumnDef<Contact>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name", width: 200, pinned: "left" },
  { id: "customer", type: "string", header: "Customer", accessorKey: "customer", width: 155 },
  { id: "email", type: "string", header: "Email", accessorKey: "email", width: 260 },
];

const contacts: Contact[] = [
  { id: "contact-1", name: "Anna Muster", customer: "Muster Haustechnik", email: "anna.muster@example.com" },
  { id: "contact-2", name: "Beat Beispiel", customer: "Beispiel Bau", email: "beat.beispiel@example.com" },
];

export function PinnedAutoLayoutDemo(): ReactElement {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  return (
    <section className="max-w-sm" data-testid="pinned-auto-layout-demo">
      <h2 className="mb-2 mt-8 text-lg font-semibold">Pinned columns without resizing</h2>
      <DataGrid
        testId="pinned-auto-layout-grid"
        columns={columns}
        dataSource={{ mode: "client", data: contacts }}
        getRowId={(row) => row.id}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        showPagination={false}
      />
    </section>
  );
}
