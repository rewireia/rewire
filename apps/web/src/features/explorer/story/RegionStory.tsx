import type { Region, RegionInsights } from '@rewire/contracts';

import { useRegionInsights } from '../../../api/insights-queries.ts';
import { QueryState } from '../../../components/QueryState.tsx';
import { useMessages } from '../../../i18n/use-messages.ts';

import { BandChart } from './BandChart.tsx';
import { Extremes } from './Extremes.tsx';
import { GroupChart } from './GroupChart.tsx';
import { GroupGrid } from './GroupGrid.tsx';
import { Headlines } from './Headlines.tsx';
import { PayChart } from './PayChart.tsx';
import styles from './Story.module.css';

/** The data story of the region chosen: figures, charts and the table, each with what it measures. */
export function RegionStory({ region }: { readonly region: Region }) {
  const { t } = useMessages();
  const insights = useRegionInsights(region);
  return (
    <section className={styles.story} aria-labelledby="insights-title">
      <header className={styles.storyHead}>
        <p className={styles.eyebrow}>{t('insights.eyebrow')}</p>
        <h2 id="insights-title">{t(`insights.title.${region}`)}</h2>
        <p className={styles.lede}>{t('insights.lede')}</p>
      </header>
      <QueryState query={insights}>{(data) => <Chapters insights={data} />}</QueryState>
    </section>
  );
}

function Chapters({ insights }: { readonly insights: RegionInsights }) {
  const { t } = useMessages();
  const { employment, pay, majorGroups, index } = insights;
  const counts = employment === null ? null : t(`insights.counts.${employment.counts}`);
  return (
    <>
      {employment !== null && <Headlines employment={employment} />}
      <div className={styles.figures}>
        {employment !== null && <BandChart employment={employment} />}
        <GroupChart groups={majorGroups} />
        {pay !== null && <PayChart pay={pay} />}
      </div>
      {employment !== null && counts !== null && (
        <section className={styles.figure} data-wide aria-labelledby="insights-grid">
          <h3 id="insights-grid" className={styles.figureTitle}>
            {t('insights.grid.title')}
          </h3>
          <p className={styles.figureCaption}>{t('insights.grid.caption', { counts })}</p>
          <GroupGrid groups={majorGroups} />
        </section>
      )}
      <Extremes index={index} />
    </>
  );
}
