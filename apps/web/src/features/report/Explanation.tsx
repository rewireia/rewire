import type { Explanation as ExplanationText, ExposureReport, Region } from '@rewire/contracts';
import { Fragment } from 'react';

import { useExplanation, useGuideAvailable } from '../../api/guide-queries.ts';
import pageStyles from '../../app/Page.module.css';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { LoadingBar } from '../../components/LoadingBar.tsx';
import { useTranslatedTasks } from '../../components/task-translations.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Explanation.module.css';
import { mentionedTasks, splitReferences, taskAnchor } from './references.ts';
import type { TimeByTask } from './times.ts';

interface ExplanationProps {
  readonly region: Region;
  readonly report: ExposureReport;
  readonly timeByTask: TimeByTask;
}

/** "In plain words": the guide writes the report out in words; the page draws its numbers. */
export function Explanation({ region, report, timeByTask }: ExplanationProps) {
  const { t, language } = useMessages();
  const available = useGuideAvailable();
  const explain = useExplanation(report.isco08);
  if (!available) {
    return null;
  }
  return (
    <section className={pageStyles.section} aria-labelledby="report-explanation">
      {!explain.isSuccess && <h2 id="report-explanation">{t('explain.title')}</h2>}
      {!explain.isSuccess && <p className={pageStyles.lede}>{t('explain.lede')}</p>}
      {!explain.isPending && !explain.isSuccess && (
        <div>
          <Button
            onClick={() => {
              explain.mutate({ region, timeByTask, lang: language });
            }}
          >
            {t('explain.button')}
          </Button>
        </div>
      )}
      {explain.isPending && <LoadingBar label={t('explain.thinking')} />}
      {explain.isError && <ErrorNotice error={explain.error} />}
      {explain.isSuccess && (
        <details open className={styles.card}>
          <summary>
            <h2 id="report-explanation">{t('explain.title')}</h2>
          </summary>
          <Written explanation={explain.data} report={report} />
        </details>
      )}
    </section>
  );
}

interface WrittenProps {
  readonly explanation: ExplanationText;
  readonly report: ExposureReport;
}

/**
 * The model's words, each task tag drawn as a link to the task with its score from the report,
 * then the tasks it mentions with their scores and source, and the note that is always beside it.
 */
function Written({ explanation, report }: WrittenProps) {
  const { t, points } = useMessages();
  const translated = useTranslatedTasks(report.isco08);
  const mentioned = mentionedTasks(explanation.paragraphs, report.tasks);
  return (
    <div className={styles.text} aria-live="polite">
      <span className={pageStyles.eyebrow}>{t('explain.label')}</span>
      {explanation.paragraphs.map((paragraph, index) => (
        // Paragraphs have no id of their own and never move: their place is their key.
        <p key={index}>
          {splitReferences(paragraph, report.tasks).map((piece, at) =>
            piece.kind === 'text' ? (
              <Fragment key={at}>{piece.text}</Fragment>
            ) : (
              <a key={at} className={styles.reference} href={`#${taskAnchor(piece.task.id)}`}>
                {t('explain.task', { number: piece.number, score: points(piece.task.score) })}
              </a>
            ),
          )}
        </p>
      ))}
      {mentioned.length > 0 && (
        <div className={styles.mentioned}>
          <span className={pageStyles.eyebrow}>{t('guide.explain.tasks')}</span>
          <ul>
            {mentioned.map(({ number, task }) => (
              <li key={task.id} id={taskAnchor(task.id)} tabIndex={-1}>
                <span className={styles.figure}>
                  {t('guide.explain.task', {
                    number,
                    score: points(task.score),
                    band: t(`band.${task.band}`),
                  })}
                </span>{' '}
                <span lang={translated.language(task)} title={translated.original(task)}>
                  {translated.text(task)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className={styles.note}>{t('explain.note')}</p>
    </div>
  );
}
