import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { useSession } from '../api/queries.ts';
import { Mark } from '../components/Mark.tsx';
import { LanguageCapsule, ThemeToggle } from '../components/Switches.tsx';
import { useCart } from '../features/cart/use-cart.ts';
import { useMessages } from '../i18n/use-messages.ts';

import { OPEN_SIGN_IN } from './access.ts';
import { BRAND_NAME } from './brand.ts';
import { Drawer } from './Drawer.tsx';
import styles from './SiteHeader.module.css';
import { usePreferences } from './preferences.ts';

/** What the cart holds, said in words for whoever cannot see its count. */
function cartLabel(count: number, t: ReturnType<typeof useMessages>['t']): string {
  if (count === 0) {
    return t('cart.link.empty');
  }
  return count === 1 ? t('cart.link.one') : t('cart.link', { count });
}

/** The cart, always at hand beside the account, with its count while it holds a course. */
function CartLink() {
  const { t } = useMessages();
  const { region } = usePreferences();
  const { ids } = useCart(region);
  const label = cartLabel(ids.length, t);
  return (
    <Link to="/cart" className={styles.cart} aria-label={label}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" />
      </svg>
      {ids.length > 0 && (
        <span className={styles.count} aria-hidden="true">
          {ids.length}
        </span>
      )}
    </Link>
  );
}

function AccessLink() {
  const { t } = useMessages();
  const { journeyRole } = usePreferences();
  const session = useSession();
  const location = useLocation();
  const signedIn = session.data?.authenticated === true && session.data.accessRole === journeyRole;
  const destination = journeyRole === 'business' ? '/business' : '/dashboard';
  const accessLabel = t(signedIn ? 'nav.dashboard' : 'access.signIn');
  return (
    <Link
      to={destination}
      className={styles.access}
      aria-label={accessLabel}
      onClick={(event) => {
        if (!signedIn && location.pathname === destination) {
          event.preventDefault();
          window.dispatchEvent(new Event(OPEN_SIGN_IN));
        }
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-4 2.7-6 7-6s7 2 7 6" />
      </svg>
      <span>{accessLabel}</span>
    </Link>
  );
}

/**
 * The one header of the site, kept at the top: the menu on the left, the mark and the name in the
 * middle, and the cart, the account, the language and the theme on the right.
 */
export function SiteHeader() {
  const { t } = useMessages();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className={styles.bar} data-print="hide">
        <div className={styles.inner}>
          <div className={styles.start}>
            <button
              ref={opener}
              type="button"
              className={styles.menu}
              aria-label={t('menu.open')}
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => {
                dialog.current?.showModal();
                setOpen(true);
              }}
            >
              <span className={styles.lines} aria-hidden="true" />
            </button>
          </div>
          <Link
            to="/"
            state={{ welcome: true }}
            className={styles.brand}
            aria-label={`${BRAND_NAME}, ${t('nav.home')}`}
          >
            <Mark size={30} />
            <span className={styles.word}>{BRAND_NAME}</span>
          </Link>
          <div className={styles.end}>
            <CartLink />
            <AccessLink />
            <LanguageCapsule />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <Drawer
        dialog={dialog}
        onClosed={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      />
    </>
  );
}
