import type { AgWidgetParams } from 'ag-studio';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { usePreferences } from '../../../../app/preferences.ts';
import { useReport } from '../../../../api/queries.ts';
import { Probe } from '../../../../components/Probe.tsx';
import { useTranslatedTasks, TranslationNote } from '../../../../components/task-translations.tsx';
import { useMessages } from '../../../../i18n/use-messages.ts';
import { reportOf } from '../../columns.tsx';

import { pickOccupation, type FocusPick, type FocusRow } from './focus-pick.ts';
import styles from './OccupationFocus.module.css';
import type { FocusWidget } from './focus-widget.ts';

/** The tasks shown: the most exposed first, as many as a widget has room for. */
const SHOWN_TASKS = 6;

/** Reads the widget's rows as the dashboard's filters leave them, and again when they change. */
function useFocus({ widgetApi, dataMapping }: AgWidgetParams<FocusWidget>): FocusPick | undefined {
  const [pick, setPick] = useState<FocusPick>();
  const occupation = dataMapping.occupation?.[0];
  const rank = dataMapping.rankBy?.[0];
  useEffect(() => {
    if (occupation === undefined) {
      return undefined;
    }
    let current = true;
    const read = (rows: readonly FocusRow[]) => {
      if (current) {
        setPick(pickOccupation(rows, occupation.key, rank?.key));
      }
    };
    const fields = rank === undefined ? [occupation] : [occupation, rank];
    void widgetApi
      .getData(
        { fields },
        {
          onDataUpdated: (response) => {
            read(response.results.rows);
          },
        },
      )
      .then((response) => {
        read(response.results.rows);
      });
    return () => {
      current = false;
    };
  }, [widgetApi, occupation, rank]);
  return pick;
}

/** "Occupation in focus": the tasks of one occupation, scored, with the way to its report. */
export function OccupationFocus(params: AgWidgetParams<FocusWidget>) {
  const { t, points } = useMessages();
  const preferences = usePreferences();
  const pick = useFocus(params);
  const report = useReport(pick?.isco08 ?? null);
  const translated = useTranslatedTasks(pick?.isco08 ?? null);
  if (pick === undefined || (pick.isco08 !== null && report.data === undefined)) {
    return <p className={styles.note}>{t('loading.label')}</p>;
  }
  if (pick.isco08 === null || report.data === undefined) {
    return <p className={styles.note}>{t('studio.focus.none')}</p>;
  }
  const { data } = report;
  return (
    <article className={styles.focus} aria-label={t('studio.focus.label')}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>
          {pick.among > 1 ? t('studio.focus.top', { count: pick.among }) : t('studio.focus.one')}
        </p>
        <h3 className={styles.title}>{data.title}</h3>
        <p className={styles.figure}>
          <span className={styles.points}>{points(data.meanScore)}</span>
          <span>{t(`gradient.${data.gradient}`)}</span>
        </p>
      </header>
      <TranslationNote status={translated.status} />
      <ol className={styles.tasks}>
        {data.tasks.slice(0, SHOWN_TASKS).map((task) => (
          <li key={task.id} className={styles.task}>
            <span
              className={styles.taskText}
              lang={translated.language(task)}
              title={translated.original(task)}
            >
              {translated.text(task)}
            </span>
            <span className={styles.score}>{points(task.score)}</span>
            <Probe score={task.score} band={task.band} range={task.range} />
          </li>
        ))}
      </ol>
      <p className={styles.foot}>
        <Link to={reportOf(data.isco08, preferences)}>{t('studio.focus.open')}</Link>
      </p>
    </article>
  );
}
