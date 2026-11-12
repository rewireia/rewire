import type { CourseContent } from '@rewire/contracts';

import { Button } from '../../components/Button.tsx';
import { Probe } from '../../components/Probe.tsx';
import { taskText } from '../../components/task-text.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Learn.module.css';

/** The practice: instructions, on the real tasks of the learner's occupation when known. */
export function Practice({
  content,
  onNext,
}: {
  readonly content: CourseContent;
  readonly onNext: (part: string) => void;
}) {
  const { t, points } = useMessages();
  const { practice } = content;
  return (
    <article className={styles.lesson} aria-labelledby="learn-practice">
      <span className={styles.small}>{t('learn.practice')}</span>
      <h2 id="learn-practice" lang="en">
        {practice.title}
      </h2>
      <p lang="en">{practice.instructions}</p>
      <h3>{t('learn.practice.tasks')}</h3>
      {practice.tasks.length === 0 ? (
        <p>{t('learn.practice.none')}</p>
      ) : (
        <ul className={styles.tasks} lang="en">
          {practice.tasks.map((task) => (
            <li key={task.id}>
              <span className="mono">{points(task.score)}</span>
              <Probe score={task.score} band={task.band} range={task.range} />
              <span className={styles.taskText}>{taskText(task.text)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <Button
          onClick={() => {
            onNext('quiz');
          }}
        >
          {t('learn.next')}
        </Button>
      </div>
    </article>
  );
}
