import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/intro">
            Get started
          </Link>
          <Link className="button button--outline button--lg" to="https://bmsuisse.github.io/bmsui/demo/datagrid/">
            Live demo
          </Link>
        </div>
      </div>
    </header>
  );
}

interface PackageCardProps {
  title: string;
  description: ReactNode;
  to: string;
}

function PackageCard({title, description, to}: PackageCardProps) {
  return (
    <div className="col col--4">
      <Link to={to} className={styles.packageCard}>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </Link>
    </div>
  );
}

function Packages() {
  return (
    <section className={styles.packages}>
      <div className="container">
        <div className="row">
          <PackageCard
            title="@bmsuisse/ui"
            to="/ui/getting-started"
            description="shadcn/ui-based React primitives (Button, Dialog, Select, Sheet, Tooltip, …) plus composed patterns (Modal, FormField, AlertBox, Combobox, …)."
          />
          <PackageCard
            title="@bmsuisse/datagrid"
            to="/datagrid/getting-started"
            description="A headless-core React data grid (TanStack Table v9): typed columns with automatic filter widgets, virtualization, and a lazy-loading tree grid."
          />
          <PackageCard
            title="bmsdna-datagrid"
            to="https://github.com/bmsuisse/bmsui/tree/main/python/datagrid"
            description="The Python counterpart — turns the same filter/sort contract into a parameterized SQL statement or a Meilisearch filter string."
          />
        </div>
      </div>
    </section>
  );
}

function Showcase() {
  const src = useBaseUrl('/img/screenshots/datagrid-orders.png');
  return (
    <section className={styles.showcase}>
      <div className="container">
        <Link to="/screenshots">
          <img src={src} alt="@bmsuisse/datagrid orders demo" className={styles.showcaseImage} />
        </Link>
        <p>
          <Link to="/screenshots">More screenshots →</Link>
        </p>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <Packages />
        <Showcase />
      </main>
    </Layout>
  );
}
