import type { CourseContent, LessonBlock } from '@rewire/contracts';

import { useCompleteLesson } from '../../api/learning-queries.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Learn.module.css';

function Block({ block }: { readonly block: LessonBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p>{block.text}</p>;
    case 'list':
      return (
        <ul className={styles.list}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'key-point':
      return <p className={styles.keyPoint}>{block.text}</p>;
  }
}

interface LessonViewProps {
  readonly content: CourseContent;
  readonly index: number;
  readonly onNext: (part: string) => void;
  /** Keeps this lesson in view once it is completed, instead of the next one. */
  readonly onPin: (part: string) => void;
}

/** One lesson: its blocks, and the way to mark it completed. */
export function LessonView({ content, index, onNext, onPin }: LessonViewProps) {
  const { t } = useMessages();
  const complete = useCompleteLesson(content.id);
  const lesson = content.lessons[index];
  if (lesson === undefined) {
    return null;
  }
  const next = content.lessons[index + 1]?.id ?? 'practice';
  return (
    <article className={styles.lesson} aria-labelledby={`lesson-${lesson.id}`}>
      <span className={styles.small}>
        {t('learn.lessonNumber', { number: index + 1, total: content.lessons.length })} ·{' '}
        {t('learn.minutes', { minutes: lesson.minutes })}
      </span>
      <h2 id={`lesson-${lesson.id}`} lang="en">
        {lesson.title}
      </h2>
      <div className={styles.blocks} lang="en">
        {lesson.blocks.map((block, at) => (
          // Blocks have no id of their own and never move: their place is their key.
          <Block key={at} block={block} />
        ))}
      </div>
      <div className={styles.actions}>
        {lesson.completed ? (
          <p className={styles.done}>{t('learn.completed')}</p>
        ) : (
          <Button
            primary
            disabled={complete.isPending}
            onClick={() => {
              onPin(lesson.id);
              complete.mutate(lesson.id);
            }}
          >
            {t('learn.complete')}
          </Button>
        )}
        <Button
          onClick={() => {
            onNext(next);
          }}
        >
          {t('learn.next')}
        </Button>
      </div>
      {complete.isError && <ErrorNotice error={complete.error} />}
    </article>
  );
}
