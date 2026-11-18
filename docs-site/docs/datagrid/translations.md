---
title: Translations
---

# Built-in translations

The datagrid ships its texts in **German, French, Italian, English, Dutch and
Spanish** (`de`, `fr`, `it`, `en`, `nl`, `es`). Set the language once instead of
translating every label yourself:

```tsx
<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} locale="de-CH" />

// or once for the whole app
<BmsLocaleProvider locale="fr-CH">
  <App />
</BmsLocaleProvider>
```

`locale` is a BCP 47 tag. Its **language** picks the texts (`de-CH` → German; a
language without built-in texts falls back to English), and the date filter's
calendar follows it (`fr-CH` and `it-CH` use date-fns' Swiss variants). Without
a `locale` everything stays English, as before.

`<DataGrid locale>` beats an enclosing `<BmsLocaleProvider>`. Standalone pieces
(`<ColumnSelector>`, filter widgets rendered outside a grid) read the provider;
`<ColumnSelector>` and `<TreeDataGrid>` also take their own `locale` prop.

## Overriding single texts

Everything you pass explicitly wins over the built-in text, key by key:

| Prop | What it overrides |
| --- | --- |
| a filter widget's `labels` | one widget (highest precedence) |
| `filterLabels` / `<FilterLabelsProvider>` | the whole filter UI (`FilterLabels`) |
| `statusLabels` | loading, empty and error states (`GridStatusLabels`) |
| `cellEditing.labels` | the fill-options menu (`CellEditingLabels`) |
| `editing.saveLabel` / `discardLabel` | the Save/Discard buttons |

Function-valued labels (`searchPlaceholder: (header) => string`) keep working.
The built-in sets are exported as plain strings/functions to build on:
`filterLabelsFor(i18n)`, `statusLabelsFor(i18n)`, `cellEditingLabelsFor(i18n)`
(`useIntegratedI18n()` gives the `i18n`).

## Not translated yet

Cell **values**: `Yes`/`No` of boolean columns and the number/date formatting
still use the runtime's default locale.
