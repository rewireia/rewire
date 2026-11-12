import { BRAND_NAME } from '../../app/brand.ts';
import { COVER } from '../../assets/cover.ts';
import { Mark } from '../../components/Mark.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Cover.module.css';
import { useOpening } from './intro/use-opening.ts';

interface CoverProps {
  readonly opening: boolean;
  readonly regionChosen: boolean;
  readonly onOpeningDone: () => void;
}

/** One photograph and one title throughout the opening, region choice and home page. */
export function Cover({ opening, regionChosen, onOpeningDone }: CoverProps) {
  const { t, language } = useMessages();
  const line = t('home.title');
  const { typed, phase } = useOpening(opening, line.length, onOpeningDone);
  const caret = opening && typed > 0 && (phase === 'typing' || phase === 'blinking');
  return (
    <section
      className={styles.cover}
      aria-labelledby="home-title"
      data-home-scene
      data-phase={opening ? phase : undefined}
      data-region-pending={!regionChosen}
    >
      <img
        className={styles.photo}
        src={COVER.src}
        srcSet={COVER.srcSet}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        decoding="async"
      />
      <div className={styles.center}>
        <div className={styles.mark}>
          <Mark size={64} animated={opening} />
        </div>
        <h1 id="home-title" className={styles.word}>
          {BRAND_NAME}
        </h1>
        <p className={styles.line} lang={language} aria-hidden="true">
          <span>{line.slice(0, typed)}</span>
          {caret && <span className={styles.caret} data-blink={phase === 'blinking'} />}
          {/* Keep the line's space after it fades, so the mark and title never jump. */}
          <span className={styles.ghost}>{line.slice(typed)}</span>
        </p>
      </div>
    </section>
  );
}
