import type { UnitGroupSummary } from '@rewire/contracts';
import {
  BarSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  type AgCartesianChartOptions,
} from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import { useTokenColors } from '../../components/use-token-color.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { MONO_FACE } from '../../theme/typefaces.ts';

import styles from './ExplorerPage.module.css';
import { histogramOf, type HistogramBin } from './histogram.ts';

const BINS = 20;
const MODULES = [BarSeriesModule, CategoryAxisModule, NumberAxisModule];
const TOKENS = {
  ink: '--ink',
  ink2: '--ink-2',
  line: '--line',
  bar: '--band-low',
  accent: '--accent',
  surface: '--paper',
} as const;

interface HistogramProps {
  readonly unitGroups: readonly UnitGroupSummary[];
  readonly mine: string | undefined;
}

type Bar = HistogramBin & { readonly label: string };

/** How the mean scores of all occupations spread, with the person's own bar in the accent. */
export function Histogram({ unitGroups, mine }: HistogramProps) {
  const { t } = useMessages();
  const colors = useTokenColors(TOKENS);
  const mineScore = unitGroups.find((group) => group.isco08 === mine)?.meanScore ?? null;
  const options = useMemo<AgCartesianChartOptions<Bar>>(() => {
    const data = histogramOf(
      unitGroups.map((group) => group.meanScore),
      BINS,
      mineScore,
    ).map((bin) => ({ ...bin, label: `${bin.from}–${bin.to}` }));
    return {
      data,
      background: { fill: colors.surface },
      animation: { enabled: false },
      height: 220,
      padding: { top: 8, right: 0, bottom: 0, left: 0 },
      series: [
        {
          type: 'bar',
          xKey: 'label',
          yKey: 'count',
          yName: t('explore.histogram.count'),
          cornerRadius: 3,
          itemStyler: ({ datum }) => ({ fill: datum.mine ? colors.accent : colors.bar }),
        },
      ],
      axes: {
        x: {
          type: 'category',
          label: { color: colors.ink2, fontFamily: MONO_FACE, fontSize: 11 },
          line: { stroke: colors.ink },
        },
        y: {
          type: 'number',
          label: { color: colors.ink2, fontFamily: MONO_FACE, fontSize: 11 },
          gridLine: { style: [{ stroke: colors.line, lineDash: [] }] },
        },
      },
    };
  }, [unitGroups, mineScore, colors, t]);

  return (
    <figure className={styles.histogram}>
      <AgCharts options={options} modules={MODULES} />
      <figcaption className={styles.count}>{t('explore.histogram.caption')}</figcaption>
    </figure>
  );
}
