import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  BmsLocaleProvider,
  Combobox,
  DateInput,
  ErrorState,
  FileInput,
  FilteredEmptyState,
  Pagination,
  SearchBar,
  useFormatLocale,
  useIntegratedI18n,
} from "@bmsuisse/ui";

const meta: Meta = { title: "Foundations/Translations", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

const LOCALES = ["de-CH", "fr-CH", "it-CH", "en", "nl", "es"] as const;

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

/** Reads the active locale back: the built-in `t`, and the tag used for number/date formatting. */
function ActiveLocale() {
  const { language, t } = useIntegratedI18n();
  const formatLocale = useFormatLocale();
  return (
    <p className="text-sm text-muted-foreground">
      language <code>{language}</code>, format locale <code>{formatLocale}</code>, <code>t("pagination.next")</code> = “{t("pagination.next")}”
    </p>
  );
}

/** Built-in texts in every language: `<BmsLocaleProvider>` sets it once; `labels` props and text props still win. */
export const Languages: Story = {
  render: () => {
    const [locale, setLocale] = useState<string>("de-CH");
    const [page, setPage] = useState(3);
    const [value, setValue] = useState<string[]>(["a", "b"]);
    const [date, setDate] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    return (
      <BmsLocaleProvider locale={locale}>
        <div className="flex max-w-3xl flex-col gap-4">
          <div className="flex overflow-hidden self-start rounded-md border text-sm" role="group" aria-label="Language">
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
          <ActiveLocale />
          <Pagination page={page} onPageChange={setPage} totalItems={1234} pageSize={25} pageSizeOptions={[10, 25, 50]} onPageSizeChange={() => {}} />
          <SearchBar value="" onChange={() => {}} />
          <Combobox multiple options={options} value={value} onChange={setValue} />
          <DateInput value={date} onValueChange={setDate} />
          <FileInput files={files} onFilesChange={setFiles} multiple />
          <ErrorState error="HTTP 503" onRetry={() => {}} />
          <FilteredEmptyState onReset={() => {}} />
        </div>
      </BmsLocaleProvider>
    );
  },
};
