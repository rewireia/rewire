import type { ExposureReport, PersonalExposure } from '@rewire/contracts';
import { DonutSeriesModule, type AgPolarChartOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo, useState } from 'react';

import pageStyles from '../../app/Page.module.css';
import { Capsule } from '../../components/Capsule.tsx';
import { useTokenColors } from '../../components/use-token-color.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import { BANDS_HIGH_FIRST } from './bands.ts';
import styles from './WeekSplit.module.css';

const MODULES = [DonutSeriesModule];
const TOKENS = {
  surface: '--surface',
  ink: '--ink',
  high: '--band-high',
  medium: '--band-medium',
  low: '--band-low',
  veryLow: '--band-very-low',
} as const;

function WeekChart({
  weekByBand,
  percent,
}: {
  readonly weekByBand: PersonalExposure['weekByBand'];
  readonly percent: boolean;
}) {
  const { t } = useMessages();
  const colors = useTokenColors(TOKENS);
  const options = useMemo<AgPolarChartOptions<{ label: string; value: number }>>(
    () => ({
      data: BANDS_HIGH_FIRST.map((band) => ({
        label: t(`band.${band}`),
        value: weekByBand[band],
      })),
      background: { fill: colors.surface },
      animation: { enabled: false },
      height: 240,
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
      legend: { enabled: false },
      series: [
        {
          type: 'donut',
          angleKey: 'value',
          calloutLabelKey: 'label',
          calloutLabel: { enabled: false },
          innerRadiusRatio: 0.76,
          innerLabels: [
            {
              text: `${Object.values(weekByBand).reduce((sum, value) => sum + value, 0)}${percent ? '%' : ''}`,
              color: colors.ink,
              fontSize: 30,
            },
          ],
          fills: [colors.high, colors.medium, colors.low, colors.veryLow],
          strokes: [colors.surface],
          strokeWidth: 2,
          tooltip: {
            enabled: true,
            renderer: ({ datum }) => ({
              title: datum.label,
              data: [{ label: '', value: `${datum.value}${percent ? '%' : ''}` }],
            }),
          },
        },
      ],
    }),
    [weekByBand, colors, t, percent],
  );
  return <AgCharts options={options} modules={MODULES} />;
}

type SplitView = 'week' | 'tasks';

interface WeekSplitProps {
  readonly weekByBand: PersonalExposure['weekByBand'];
  readonly tasksByBand: ExposureReport['tasksByBand'];
  readonly weekLabel: string;
  readonly tasksLabel: string;
  readonly selectorLabel: string;
  readonly tasksCaption: string;
}

/** Shows the time-weighted week or the occupation's count of tasks in each band. */
export function WeekSplit(props: WeekSplitProps) {
  const { weekByBand, tasksByBand, weekLabel, tasksLabel, selectorLabel, tasksCaption } = props;
  const [view, setView] = useState<SplitView>('week');
  const { t, language } = useMessages();
  const numbers = new Intl.NumberFormat(language);
  const values = view === 'week' ? weekByBand : tasksByBand;
  const hasValues = BANDS_HIGH_FIRST.some((band) => values[band] > 0);
  const options: { value: SplitView; label: string }[] = [
    { value: 'week', label: weekLabel },
    { value: 'tasks', label: tasksLabel },
  ];
  return (
    <section className={`${pageStyles.section} ${styles.panel}`} aria-labelledby="report-split">
      <h2 id="report-split">{t('report.split.title')}</h2>
      <Capsule legend={selectorLabel} options={options} value={view} onChange={setView} />
      <p className={styles.caption}>{view === 'week' ? t('report.split.caption') : tasksCaption}</p>
      <div className={styles.layout}>
        {hasValues && (
          <div className={styles.chart} aria-hidden="true">
            <WeekChart weekByBand={values} percent={view === 'week'} />
          </div>
        )}
        <ul className={styles.legend}>
          {BANDS_HIGH_FIRST.map((band) => (
            <li
              key={band}
              data-band={band}
              aria-label={
                view === 'week'
                  ? t('report.split.item', { band: t(`band.${band}`), points: values[band] })
                  : undefined
              }
            >
              <span className={styles.swatch} />
              <span>{t(`band.${band}`)}</span>
              <span className={styles.points}>
                {numbers.format(values[band])}
                {view === 'week' ? '%' : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
