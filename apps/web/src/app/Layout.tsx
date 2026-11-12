import { Link, Outlet, ScrollRestoration } from 'react-router';

import { GuideLauncher } from '../features/guide/GuideLauncher.tsx';
import { useMessages } from '../i18n/use-messages.ts';

import styles from './Layout.module.css';
import { SiteHeader } from './SiteHeader.tsx';

/** The minimal footer: the copyright line and, beneath it, credits and sources and privacy. */
function Footer() {
  const { t } = useMessages();
  return (
    <footer className={styles.footer} data-print="hide">
      <p className={styles.copyright}>
        {t('footer.copyright', { year: String(new Date().getFullYear()) })}
      </p>
      <nav className={styles.footerLinks} aria-label={t('footer.label')}>
        <Link to="/credits">{t('footer.sources')}</Link>
        <Link to="/privacy">{t('footer.privacy')}</Link>
      </nav>
    </footer>
  );
}

/** The frame of every page: the header, the page, the footer and the guide's panel. */
export function Layout() {
  const { t } = useMessages();
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        {t('nav.skip')}
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <Footer />
      <GuideLauncher />
      <ScrollRestoration />
    </div>
  );
}
