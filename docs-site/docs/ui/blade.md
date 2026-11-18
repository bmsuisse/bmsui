---
sidebar_position: 6
title: Blade (PHP / OneDesk)
---

# Blade components for PHP / OneDesk

The BMS design as **Blade components** for PHP/Laravel apps (OneDesk/FreeScout, any Laravel 11/12 app):
the same look as the React `@bmsuisse/ui`, as plain CSS + a little vanilla JS.
**No build step, no Tailwind, no jQuery dependency**, and it coexists with Bootstrap 3. Colours are CSS
variables (`--bmsui-*`); a `.dm` class on `<body>` switches to night mode (FreeScout/BMS Design already sets it).

| Component | Usage |
|---|---|
| Chip | `<x-bmsui::chip tone="success" href="/x" removable>Text</x-bmsui::chip>` (`neutral`, `info`, `success`, `warning`, `danger`) |
| Banner | `<x-bmsui::banner tone="warning" title="Title" dismissible>Text</x-bmsui::banner>` |
| Stat strip | `<x-bmsui::stat-strip><x-bmsui::stat label="Open" value="128" sub="+12" trend="down"/></x-bmsui::stat-strip>` |
| Timeline | `<x-bmsui::timeline><x-bmsui::timeline-item title="Assigned" time="14.11.2026 09:12" tone="accent">Body</x-bmsui::timeline-item></x-bmsui::timeline>` |
| Copy button | `<x-bmsui::copy-button value="OFF-1" label="Copy"/>` (no `label` = icon only, set `aria-label`) |
| Confirm popover | `<x-bmsui::confirm action="{{ route('x.destroy', $x) }}" method="DELETE" message="Really delete?">Delete</x-bmsui::confirm>`; without `action` it fires a `bmsui:confirm` event |
| AI button | `<x-bmsui::ai-button variant="subtle" :loading="$busy">Draft reply</x-bmsui::ai-button>` (`solid`, `subtle`, `ghost`; theme accent with a soft glow) |
| Brand logo | `<x-bmsui::brand product="Desk" :size="32" :animate="true"/>` (`mode`: `full`, `one`, `mark`) |

All texts are props (defaults go through `__()`), all content is escaped. Behaviour is delegated
(`resources/js/bmsui.js`), so HTML added later (ajax) just works.

![Desktop, light](/img/blade/desktop-light.png)
![Desktop, night mode](/img/blade/desktop-dark.png)
![Phone](/img/blade/phone-light.png)

## Install (Laravel)

```bash
composer require bmsuisse/bmsui-blade
php artisan vendor:publish --tag=bmsui-assets   # copies bmsui.css / bmsui.js to public/vendor/bmsui
```

```blade
<head> @bmsuiAssets("css") </head>
<body> ... @bmsuiAssets("js") </body>   {{-- or a single @bmsuiAssets for both --}}
```

Until it is on Packagist/your feed, require it from the repo with a `path` or `vcs` repository entry
pointing at `php/bmsui-blade`.

## OneDesk / FreeScout

FreeScout has its own asset pipeline, so a module registers the two files through its hooks instead of
`@bmsuiAssets`. Put this in a module's service provider (e.g. in `BMSDesign`) after `composer require`:

```php
use BMSuisse\BMSUi\BMSUi;

\Eventy::addFilter('stylesheets', fn ($s) => array_merge($s, [BMSUi::cssPath()]));
\Eventy::addFilter('javascripts', fn ($j) => array_merge($j, [BMSUi::jsPath()]));
```

If your asset pipeline needs files under `public/`, publish them (`--tag=bmsui-assets`) and use those
paths. Night mode follows automatically because BMS Design adds `.dm` to `<body>`. The components
render with Bootstrap 3 loaded (`box-sizing`, link and button resets are handled).

## Preview and tests

`view('bmsui::preview')` renders every component (pass `['dark' => true]` for night mode); mount it behind
your own auth on a route to review them.

```bash
composer install
vendor/bin/phpunit
```

## Keeping it in sync with the React library

The design tokens, tones and the AI glow recipe come from `packages/ui`. When a component's look changes
there, change the matching class in `resources/css/bmsui.css`; the screenshots in `docs/` come from
`view('bmsui::preview')`.
