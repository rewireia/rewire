import type { ExposureTask, Pathway } from '@rewire/contracts';
import {
  BarSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  type AgCartesianChartOptions,
} from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import pageStyles from '../../app/Page.module.css';
import { TranslationNote, useTranslatedTasks } from '../../components/task-translations.tsx';
import { useTokenColors } from '../../components/use-token-color.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { MONO_FACE } from '../../theme/typefaces.ts';

import styles from './Plan.module.css';

const MODULES = [BarSeriesModule, CategoryAxisModule, NumberAxisModule];
const TOKENS = {
  ink: '--ink',
  ink2: '--ink-2',
  line: '--line',
  accent: '--accent',
  surface: '--paper',
} as const;

interface Bar {
  readonly label: string;
  readonly score: number;
}

function FocusList({
  tasks,
  isco08,
}: {
  readonly tasks: readonly ExposureTask[];
  readonly isco08: string;
}) {
  const { t } = useMessages();
  const colors = useTokenColors(TOKENS);
  const options = useMemo<AgCartesianChartOptions<Bar>>(
    () => ({
      data: tasks.map((task, index) => ({
        label: t('plan.focus.task', { number: index + 1 }),
        score: task.score * 100,
      })),
      background: { fill: colors.surface },
      animation: { enabled: false },
      height: Math.max(160, tasks.length * 45 + 50),
      padding: { top: 8, right: 12, bottom: 0, left: 0 },
      series: [
        {
          type: 'bar',
          direction: 'horizontal',
          xKey: 'label',
          yKey: 'score',
          fill: colors.accent,
          cornerRadius: 4,
        },
      ],
      axes: {
        y: {
          type: 'category',
          label: { color: colors.ink2, fontFamily: MONO_FACE, fontSize: 11 },
          line: { stroke: colors.ink },
        },
        x: {
          type: 'number',
          min: 0,
          max: 100,
          label: { color: colors.ink2, fontFamily: MONO_FACE, fontSize: 11 },
          gridLine: { style: [{ stroke: colors.line, lineDash: [] }] },
        },
      },
    }),
    [tasks, colors, t],
  );
  return (
    <div className={styles.focusChart}>
      <AgCharts options={options} modules={MODULES} />
      <FocusDetails tasks={tasks} isco08={isco08} />
    </div>
  );
}

function FocusDetails({
  tasks,
  isco08,
}: {
  readonly tasks: readonly ExposureTask[];
  readonly isco08: string;
}) {
  const { t, points } = useMessages();
  const translated = useTranslatedTasks(isco08);
  return (
    <ol className={styles.focusDetails}>
      {tasks.map((task, index) => (
        <li key={task.id}>
          <strong>{points(task.score)}/100</strong>
          <details>
            <summary>
              <b>{t('plan.focus.task', { number: index + 1 })}.</b>{' '}
              <span lang={translated.language(task)} title={translated.original(task)}>
                {translated.text(task)}
              </span>
            </summary>
            <p>
              {t('report.table.col.band')}: {t(`band.${task.band}`)} · {t('report.table.col.range')}
              : {points(task.range.low)}–{points(task.range.high)}
            </p>
          </details>
        </li>
      ))}
    </ol>
  );
}

/** The most and least exposed tasks behind the learning plan. */
export function PlanFocus({
  focus,
  isco08,
}: {
  readonly focus: Pathway['focus'];
  readonly isco08: string;
}) {
  const { t } = useMessages();
  const translated = useTranslatedTasks(isco08);
  const both = focus.leastExposed.length > 0;
  return (
    <section className={pageStyles.section} aria-label={t('plan.focus.label')}>
      <p className={styles.small}>{t('plan.focus.chartCaption')}</p>
      <TranslationNote status={translated.status} />
      <div className={styles.focus} data-columns={both ? 2 : 1}>
        <div>
          <h2>{t('plan.focus.most')}</h2>
          <p className={styles.small}>{t('plan.focus.mostLede')}</p>
          <FocusList tasks={focus.mostExposed} isco08={isco08} />
        </div>
        {both && (
          <div>
            <h2>{t('plan.focus.least')}</h2>
            <p className={styles.small}>{t('plan.focus.leastLede')}</p>
            <FocusList tasks={focus.leastExposed} isco08={isco08} />
          </div>
        )}
      </div>
    </section>
  );
}
