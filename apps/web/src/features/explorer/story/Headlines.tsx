import type { EmploymentInsights } from '@rewire/contracts';

import { BigFigure } from '../../../components/BigFigure.tsx';
import { RadialGauge } from '../../../components/RadialGauge.tsx';
import type { GaugeBand } from '../../../components/RadialGaugeArc.ts';
import { toPoints } from '../../../i18n/format.ts';
import { useMessages } from '../../../i18n/use-messages.ts';

import { exposureBands, reachesHigh, upperShare } from './story.ts';
import styles from './Story.module.css';
import { useStoryFormat } from './use-story-format.ts';

/** The three figures that open the story of a region, each with its sentence. */
export function Headlines({ employment }: { readonly employment: EmploymentInsights }) {
  const { t, points } = useMessages();
  const format = useStoryFormat();
  const counts = t(`insights.counts.${employment.counts}`);
  const upper = t('insights.figure.medium.body', { counts });
  const bands: readonly GaugeBand[] = exposureBands((band) => t(`band.${band}`));
  return (
    <div className={styles.headlines}>
      <RadialGauge
        label={t('insights.figure.mean.label')}
        value={toPoints(employment.meanScore)}
        display={points(employment.meanScore)}
        unit="/100"
        bands={bands}
        note={t('insights.figure.mean.body', { counts })}
        size="small"
      />
      <BigFigure
        label={t('insights.figure.medium.label')}
        value={format.percent(upperShare(employment))}
        sentence={
          reachesHigh(employment) ? upper : `${upper} ${t('insights.figure.medium.noHigh')}`
        }
      />
      <BigFigure
        label={t(`insights.figure.counted.label.${employment.counts}`)}
        value={format.compact(employment.matched)}
        sentence={t('insights.figure.counted.body', {
          matched: format.compact(employment.matched),
          total: format.compact(employment.total),
        })}
      />
    </div>
  );
}
