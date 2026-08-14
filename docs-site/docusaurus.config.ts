import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// Fully-qualified (not root-relative) on purpose: the demo apps are a
// separate static build copied alongside this site at deploy time (see
// .github/workflows/pages.yml), not a Docusaurus route — a root-relative
// link here would fail Docusaurus's own build-time broken-link check, which
// has no way to know that path will exist once deployed.
const DEMO_BASE = 'https://bmsuisse.github.io/bmsui/demo';

const config: Config = {
  title: 'bmsui',
  tagline: 'Shared React UI primitives and a headless data grid, built for bmsuisse apps',
  favicon: 'img/favicon.svg',

  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: 'https://bmsuisse.github.io',
  baseUrl: '/bmsui/',

  organizationName: 'bmsuisse',
  projectName: 'bmsui',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/bmsuisse/bmsui/tree/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'bmsui',
      logo: {
        alt: 'bmsui logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'dropdown',
          label: 'Live Demo',
          position: 'left',
          items: [
            {label: '@bmsuisse/ui', href: `${DEMO_BASE}/ui/`},
            {label: '@bmsuisse/datagrid', href: `${DEMO_BASE}/datagrid/`},
          ],
        },
        {
          href: 'https://github.com/bmsuisse/bmsui',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Getting started', to: '/intro'},
            {label: '@bmsuisse/ui', to: '/ui/getting-started'},
            {label: '@bmsuisse/datagrid', to: '/datagrid/getting-started'},
          ],
        },
        {
          title: 'Live demo',
          items: [
            {label: 'UI kit', href: `${DEMO_BASE}/ui/`},
            {label: 'DataGrid', href: `${DEMO_BASE}/datagrid/`},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'GitHub', href: 'https://github.com/bmsuisse/bmsui'},
            {label: '@bmsuisse/ui on npm', href: 'https://www.npmjs.com/package/@bmsuisse/ui'},
            {label: '@bmsuisse/datagrid on npm', href: 'https://www.npmjs.com/package/@bmsuisse/datagrid'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} bmsuisse. MIT licensed.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
