import type { CourseContent } from '@rewire/contracts';
import { useSearchParams } from 'react-router';

import pageStyles from '../../app/Page.module.css';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Learn.module.css';
import { LessonView } from './LessonView.tsx';
import { Practice } from './Practice.tsx';
import { Quiz } from './Quiz.tsx';

type Part = { kind: 'lesson'; index: number } | { kind: 'practice' } | { kind: 'quiz' };

/** The part of the course the address names; the first lesson not yet completed by default. */
function partOf(content: CourseContent, name: string | null): Part {
  if (name === 'practice' || name === 'quiz') {
    return { kind: name };
  }
  const named = content.lessons.findIndex((lesson) => lesson.id === name);
  if (named >= 0) {
    return { kind: 'lesson', index: named };
  }
  const next = content.lessons.findIndex((lesson) => !lesson.completed);
  return next >= 0 ? { kind: 'lesson', index: next } : { kind: 'quiz' };
}

/** The course: its contents on one side, the part being studied on the other. */
export function LearnView({ content }: { readonly content: CourseContent }) {
  const { t } = useMessages();
  const [params, setParams] = useSearchParams();
  const part = partOf(content, params.get('part'));
  const go = (name: string) => {
    setParams({ part: name });
    document.getElementById('learn-part')?.focus();
  };
  const done = content.lessons.filter((lesson) => lesson.completed).length;
  return (
    <>
      <header className={pageStyles.intro}>
        <span className={pageStyles.eyebrow}>
          {t(`stage.${content.stage}`)} · {t(`learn.status.${content.status}`)}
        </span>
        <h1 lang="en">{content.title}</h1>
        <p className={styles.small}>
          {t('learn.progress', { done, total: content.lessons.length })}
        </p>
      </header>
      <div className={styles.layout}>
        <Contents content={content} part={part} onGo={go} />
        <div id="learn-part" className={styles.part} tabIndex={-1}>
          {part.kind === 'lesson' && (
            <LessonView
              content={content}
              index={part.index}
              onNext={go}
              onPin={(name) => {
                setParams({ part: name }, { replace: true });
              }}
            />
          )}
          {part.kind === 'practice' && <Practice content={content} onNext={go} />}
          {part.kind === 'quiz' && <Quiz content={content} />}
        </div>
      </div>
    </>
  );
}

interface ContentsProps {
  readonly content: CourseContent;
  readonly part: Part;
  readonly onGo: (name: string) => void;
}

/** The index of the course: each lesson with its state, then the practice and the quiz. */
function Contents({ content, part, onGo: go }: ContentsProps) {
  const { t } = useMessages();
  return (
    <nav className={styles.contents} aria-label={t('learn.contents')}>
      <span className={pageStyles.eyebrow}>{t('learn.contents')}</span>
      <ol>
        {content.lessons.map((lesson, index) => (
          <li key={lesson.id}>
            <button
              type="button"
              aria-current={part.kind === 'lesson' && part.index === index ? 'step' : undefined}
              onClick={() => {
                go(lesson.id);
              }}
            >
              <span className={styles.mark} data-done={lesson.completed} aria-hidden="true" />
              <span lang="en">{lesson.title}</span>
              <span className="visually-hidden">
                {lesson.completed ? t('learn.lesson.done') : t('learn.lesson.todo')}
              </span>
            </button>
          </li>
        ))}
        {(['practice', 'quiz'] as const).map((name) => (
          <li key={name}>
            <button
              type="button"
              aria-current={part.kind === name ? 'step' : undefined}
              onClick={() => {
                go(name);
              }}
            >
              <span
                className={styles.mark}
                data-done={name === 'quiz' && content.quiz.passed}
                aria-hidden="true"
              />
              <span>{t(`learn.${name}`)}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
