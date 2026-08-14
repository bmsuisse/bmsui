# bmsui docs site

[Docusaurus](https://docusaurus.io/) site for `@bmsuisse/ui` and
`@bmsuisse/datagrid`, deployed to
[bmsuisse.github.io/bmsui](https://bmsuisse.github.io/bmsui/) on every push
to `main` (see `../.github/workflows/pages.yml`) — not deployed via
`docusaurus deploy`/the `gh-pages` branch.

```bash
bun run start   # local dev server at http://localhost:3000
bun run build   # static output in build/
```

The navbar's "Live Demo" links and the screenshot gallery point at
`packages/*/demo`'s static builds and `static/img/screenshots/`
respectively — both produced by `../.github/workflows/pages.yml`, not by
this site's own build. Run `bun run screenshots` from the repo root to
regenerate the screenshots locally (see `../scripts/screenshots.ts`).
