---
title: Translations
---

# Built-in translations

Every text a `@bmsuisse/ui` component renders on its own ships in **German,
French, Italian, English, Dutch and Spanish** (`de`, `fr`, `it`, `en`, `nl`,
`es`). Set the language once:

```tsx
import { BmsLocaleProvider } from "@bmsuisse/ui";

<BmsLocaleProvider locale="de-CH">
  <App />
</BmsLocaleProvider>
```

`locale` is a BCP 47 tag. Its **language** picks the texts (`de-CH` → German; a
language without built-in texts falls back to English). Without a provider
everything stays English, as before.

## Number and date formats follow too

Components with a `locale` prop (`Pagination`, `NumberInput`, `DateInput`,
`Timestamp`, …) used to default to `de-CH`. The default is now: the component's
own `locale` prop, else the provider's locale, else `de-CH`. So
`<BmsLocaleProvider locale="fr-CH">` also formats numbers and dates the Swiss
French way, and an app without a provider is unchanged. `useFormatLocale()`
gives you the same resolution for your own formatting.

## Overriding single texts

Anything you pass explicitly wins over the built-in text, key by key:

- the component's `labels` prop (`<Pagination labels={{ next: "Weiter geht's" }} />`),
- text props that used to default to English (`confirmLabel`, `cancelLabel`,
  `submitLabel`, `placeholder`, `searchPlaceholder`, `emptyMessage`,
  `loadingMessage`, `clearLabel`, `navLabel`, …).

The exported `default<Name>Labels` objects keep the English strings.
`useIntegratedI18n()` returns `{ locale, language, t }` if you want to look up
a built-in text yourself.

## Not translated yet

Keyboard key names (`Esc`, `Ctrl`), the `dd.mm.yyyy` date-format hint letters,
AM/PM, the `alpha`/`beta` page-header badges and the animated brand demo labels.
