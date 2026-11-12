import type { CourseContent, QuizResult } from '@rewire/contracts';
import { useId } from 'react';

import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Learn.module.css';

interface QuizQuestionProps {
  readonly question: CourseContent['quiz']['questions'][number];
  readonly number: number;
  readonly chosen: number | undefined;
  /** After an attempt: whether it was right, the right option and why. */
  readonly review: QuizResult['questions'][number] | undefined;
  readonly onChoose: (option: number) => void;
}

/** One question as a radio group: arrow keys move between its options. */
export function QuizQuestion({ question, number, chosen, review, onChoose }: QuizQuestionProps) {
  const { t } = useMessages();
  const name = useId();
  const answer = review === undefined ? undefined : question.options[review.correctOption];
  return (
    <div className={styles.questionBox}>
      <fieldset className={styles.question}>
        <legend>
          <span className={styles.small}>{t('learn.quiz.question', { number })}</span>
          <span className={styles.prompt} lang="en">
            {question.prompt}
          </span>
        </legend>
        {question.options.map((option, index) => (
          <label key={option} className={styles.option} lang="en">
            <input
              type="radio"
              name={name}
              checked={chosen === index}
              onChange={() => {
                onChoose(index);
              }}
            />
            <span>{option}</span>
          </label>
        ))}
        {review !== undefined && (
          <div className={review.correct ? styles.done : styles.notice}>
            <p>
              {review.correct
                ? t('learn.quiz.right')
                : t('learn.quiz.wrong', { answer: answer ?? '' })}
            </p>
            <p className={styles.small} lang="en">
              {review.explanation}
            </p>
          </div>
        )}
      </fieldset>
    </div>
  );
}
