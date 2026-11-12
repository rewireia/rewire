import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import { NavLink, useLocation } from 'react-router';

import { useSession } from '../api/queries.ts';
import { cx } from '../components/cx.ts';
import { Icon } from '../components/Icon.tsx';
import { RegionSwitch } from '../components/RegionSwitch.tsx';
import { ThemeCapsule } from '../components/Switches.tsx';
import { useMessages } from '../i18n/use-messages.ts';

import { OPEN_SIGN_IN } from './access.ts';
import styles from './Drawer.module.css';
import { usePreferences } from './preferences.ts';

/** A page of the menu. */
interface Entry {
  readonly key: string;
  readonly title: string;
  readonly to: string;
}

/** The menu in its order, with destinations for the selected journey. */
function useEntries(): readonly Entry[] {
  const { t } = useMessages();
  const { journeyRole } = usePreferences();
  return [
    { key: 'home', to: '/', title: t('nav.home') },
    {
      key: 'start',
      to: journeyRole === 'business' ? '/business' : '/start',
      title: t('nav.start'),
    },
    {
      key: 'dashboard',
      to: journeyRole === 'business' ? '/business' : '/dashboard',
      title: t('nav.dashboard'),
    },
    { key: 'ai', to: '/what-is-ai', title: t('nav.ai') },
    { key: 'rewire', to: '/what-is-rewire', title: t('nav.rewire') },
    { key: 'explore', to: '/explore', title: t('nav.explore') },
    { key: 'library', to: '/library', title: t('nav.library') },
    { key: 'courses', to: '/courses', title: t('nav.courses') },
  ];
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:checked';

/** Tab and Shift+Tab go round inside the menu instead of leaving it for the browser. */
function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') {
    return;
  }
  const stops = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = stops[0];
  const last = stops.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

/** One destination, named plainly, with its active state supplied by the router. */
interface RowProps {
  readonly entry: Entry;
  readonly onGo: () => void;
}

function Row({ entry, onGo }: RowProps) {
  const { journeyRole } = usePreferences();
  const session = useSession();
  const location = useLocation();
  const signedIn = session.data?.authenticated === true && session.data.accessRole === journeyRole;
  return (
    <NavLink
      to={entry.to}
      state={entry.key === 'home' ? { welcome: true } : undefined}
      className={cx(styles.row)}
      onClick={(event) => {
        onGo();
        if (
          (entry.key === 'dashboard' || entry.key === 'start') &&
          entry.to === location.pathname &&
          !signedIn
        ) {
          event.preventDefault();
          window.setTimeout(() => {
            window.dispatchEvent(new Event(OPEN_SIGN_IN));
          }, 0);
        }
      }}
    >
      <span className={styles.title}>{entry.title}</span>
    </NavLink>
  );
}

interface DrawerProps {
  readonly dialog: RefObject<HTMLDialogElement | null>;
  readonly onClosed: () => void;
}

/**
 * The menu: a modal dialog whose panel comes in from the left under the header, with the
 * destinations in large type and, at its foot, the region and the theme. The focus stays inside
 * and Escape, the veil and the cross close it; the page behind does not scroll.
 */
export function Drawer({ dialog, onClosed }: DrawerProps) {
  const { t } = useMessages();
  const entries = useEntries();
  const close = () => dialog.current?.close();
  return (
    <dialog
      ref={dialog}
      className={styles.drawer}
      aria-label={t('menu.title')}
      onClose={onClosed}
      onKeyDown={keepFocusInside}
      onClick={(event) => {
        // A click on the band of the header, outside the panel, closes the menu too.
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div className={styles.veil} onClick={close} aria-hidden="true" />
      <button type="button" className={styles.close} aria-label={t('menu.close')} onClick={close}>
        <Icon name="close" size={22} />
      </button>
      <div className={styles.panel}>
        <nav aria-label={t('nav.label')}>
          <ul className={styles.list}>
            {entries.map((entry, index) => (
              <li key={entry.key} style={{ '--i': index } as CSSProperties}>
                <Row entry={entry} onGo={close} />
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.foot} style={{ '--i': entries.length } as CSSProperties}>
          <RegionSwitch fill />
          <ThemeCapsule />
        </div>
      </div>
    </dialog>
  );
}
