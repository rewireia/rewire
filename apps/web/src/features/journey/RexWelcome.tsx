import { useEffect, useState } from 'react';
import { safeStorage } from '../../app/storage.ts';
import { Mark } from '../../components/Mark.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import styles from './RexChat.module.css';

const played = new Set<string>();
const storage = safeStorage('sessionStorage');
const DURATION = 2400;
const FRAMES = 48;

/** Animate once per language and visit; announce the completed greeting only once. */
export function RexWelcome() {
  const { t, language } = useMessages();
  const greeting = t('conversation.rex.greeting');
  const key = `rewire.rex.greeting.${language}`;
  const [animate] = useState(
    () =>
      !played.has(key) &&
      storage?.getItem(key) !== '1' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [frame, setFrame] = useState(animate ? 0 : FRAMES);
  useEffect(() => {
    played.add(key);
    storage?.setItem(key, '1');
    if (!animate) return;
    const timers = Array.from({ length: FRAMES }, (_, index) =>
      window.setTimeout(
        () => {
          setFrame(index + 1);
        },
        ((index + 1) * DURATION) / FRAMES,
      ),
    );
    return () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, [animate, key]);
  const characters = Array.from(greeting);
  const length = Math.ceil((characters.length * frame) / FRAMES);
  return (
    <div className={styles.messageRow}>
      <span className={styles.avatar}>
        <Mark size={20} />
      </span>
      <div className={styles.messageBody}>
        <span className={styles.author}>Rex</span>
        <div className={styles.bubble}>
          <p aria-hidden="true">{characters.slice(0, length).join('')}</p>
          <span className="visually-hidden" aria-live="polite">
            {frame === FRAMES ? greeting : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
