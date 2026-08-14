import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: '@bmsuisse/ui',
      link: {type: 'doc', id: 'ui/getting-started'},
      items: ['ui/getting-started', 'ui/primitives', 'ui/patterns'],
    },
    {
      type: 'category',
      label: '@bmsuisse/datagrid',
      link: {type: 'doc', id: 'datagrid/getting-started'},
      items: [
        'datagrid/getting-started',
        'datagrid/columns-and-filters',
        'datagrid/server-vs-client',
        'datagrid/tree-data-grid',
        'datagrid/column-selector',
      ],
    },
    'screenshots',
  ],
};

export default sidebars;
