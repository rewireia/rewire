import type { RegionInsights } from '@rewire/contracts';
import { Link } from 'react-router';

import { usePreferences } from '../../../app/preferences.ts';
import { useMessages } from '../../../i18n/use-messages.ts';
import { reportOf } from '../columns.tsx';

import styles from './Story.module.css';

type Line = RegionInsights['index']['mostExposed'][number];

/** The five most and the five least exposed unit groups of the index, each opening its report. */
export function Extremes({ index }: { readonly index: RegionInsights['index'] }) {
  const { t } = useMessages();
  return (
    <section className={styles.figure} data-wide aria-labelledby="insights-extremes">
      <h3 id="insights-extremes" className={styles.figureTitle}>
        {t('insights.extremes.title')}
      </h3>
      <p className={styles.figureCaption}>{t('insights.extremes.caption')}</p>
      <div className={styles.extremes}>
        <Ranking title={t('insights.extremes.most')} lines={index.mostExposed} />
        <Ranking title={t('insights.extremes.least')} lines={index.leastExposed} />
      </div>
    </section>
  );
}

function Ranking({ title, lines }: { readonly title: string; readonly lines: readonly Line[] }) {
  const { points } = useMessages();
  const preferences = usePreferences();
  return (
    <div className={styles.ranking}>
      <h4>{title}</h4>
      <ol>
        {lines.map((line) => (
          <li key={line.isco08}>
            <Link to={reportOf(line.isco08, preferences)}>
              <span className={styles.code}>{line.isco08}</span>
              <span className={styles.rankTitle}>{line.title}</span>
              <span className={styles.rankPoints}>{points(line.meanScore)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
