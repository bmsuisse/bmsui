import type { Meta, StoryObj } from "@storybook/react-vite";
import { BmsLocaleProvider, ColumnSelector, DataGrid } from "@bmsuisse/datagrid";
import { useState } from "react";
import { getOrderId, orderColumns, orders } from "./sampleData";

const meta: Meta = { title: "DataGrid/Translations", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

const LOCALES = ["de-CH", "fr-CH", "it-CH", "en", "nl", "es"] as const;

/** Built-in texts of the grid in every language: `<BmsLocaleProvider>` sets it once for everything below (a grid can also take its own `locale`). */
export const Languages: Story = {
  render: () => {
    const [locale, setLocale] = useState<string>("de-CH");
    const [visibility, setVisibility] = useState({});
    return (
      <BmsLocaleProvider locale={locale}>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-md border text-sm" role="group" aria-label="Language">
            {LOCALES.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={locale === tag}
                className="px-2 py-1 aria-pressed:bg-accent aria-pressed:text-accent-foreground"
                onClick={() => setLocale(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <ColumnSelector columns={orderColumns} visibility={visibility} onVisibilityChange={setVisibility} />
        </div>
        <DataGrid
          columns={orderColumns}
          dataSource={{ mode: "client", data: orders }}
          getRowId={getOrderId}
          initialState={{ pageSize: 5 }}
          selectedIds={new Set(["1001", "1002"])}
          onSelectedIdsChange={() => {}}
          headerActions={[{ id: "export", label: "Export", onSelect: () => {} }]}
        />
      </BmsLocaleProvider>
    );
  },
};
