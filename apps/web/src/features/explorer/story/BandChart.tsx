import type { EmploymentInsights } from '@rewire/contracts';
import { BarSeriesModule, CategoryAxisModule, NumberAxisModule } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import { useMessages } from '../../../i18n/use-messages.ts';

import { horizontalBars, useStoryColors } from './chart-theme.ts';
import { lowerShare } from './story.ts';
import { StoryFigure } from './StoryFigure.tsx';
import { useStoryFormat } from './use-story-format.ts';

const MODULES = [BarSeriesModule, CategoryAxisModule, NumberAxisModule];

/** Employment by the band of its occupation's exposure, as a share of all those counted. */
export function BandChart({ employment }: { readonly employment: EmploymentInsights }) {
  const { t } = useMessages();
  const format = useStoryFormat();
  const colors = useStoryColors();
  const counts = t(`insights.counts.${employment.counts}`);
  const options = useMemo(
    () =>
      horizontalBars(
        colors,
        employment.byBand.map(({ band, share }) => ({
          label: t(`band.${band}`),
          value: share * 100,
          color: colors[band],
        })),
        t('insights.bands.axis', { counts }),
        ' %',
      ),
    [employment, colors, t, counts],
  );
  return (
    <StoryFigure
      title={t('insights.bands.title', { share: format.percent(lowerShare(employment)), counts })}
      caption={t('insights.bands.caption', { counts })}
      chart={<AgCharts options={options} modules={MODULES} />}
      lines={employment.byBand.map((band) =>
        t('insights.bands.row', {
          band: t(`band.${band.band}`),
          share: format.percent(band.share),
          employed: format.compact(band.employed),
          groups: band.groups,
        }),
      )}
      level={t(`insights.level.${employment.level}`)}
    />
  );
}
