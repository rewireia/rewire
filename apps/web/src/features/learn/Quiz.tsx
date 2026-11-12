import type { CourseContent, QuizResult } from '@rewire/contracts';
import { useState } from 'react';

import { useSubmitQuiz } from '../../api/learning-queries.ts';
import { Button, ButtonLink } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { ClaimCertificate } from './ClaimCertificate.tsx';
import styles from './Learn.module.css';
import { QuizQuestion } from './QuizQuestion.tsx';

/** The quiz on one page: native radio groups, then the result with every explanation. */
export function Quiz({ content }: { readonly content: CourseContent }) {
  const { t } = useMessages();
  const { quiz } = content;
  const submit = useSubmitQuiz(content.id);
  const result: QuizResult | undefined = submit.data;

  if (content.certificateId !== null) {
    return (
      <article className={styles.lesson} aria-labelledby="learn-quiz">
        <h2 id="learn-quiz">{t('learn.quiz')}</h2>
        <p className={styles.done}>{t('learn.quiz.alreadyPassed')}</p>
        <div>
          <ButtonLink primary to={`/certificates/${content.certificateId}`}>
            {t('learn.certificate.view')}
          </ButtonLink>
        </div>
      </article>
    );
  }
  if (quiz.passed || result?.passed === true) {
    return (
      <article className={styles.lesson} aria-labelledby="learn-quiz">
        <h2 id="learn-quiz">{t('learn.quiz')}</h2>
        {result === undefined ? (
          <p className={styles.done}>{t('learn.quiz.alreadyPassed')}</p>
        ) : (
          <ResultSummary result={result} />
        )}
        <ClaimCertificate courseId={content.id} />
        {result !== undefined && <Explanations content={content} result={result} />}
      </article>
    );
  }
  return <QuizForm content={content} submit={submit} />;
}

interface QuizFormProps {
  readonly content: CourseContent;
  readonly submit: ReturnType<typeof useSubmitQuiz>;
}

function QuizForm({ content, submit }: QuizFormProps) {
  const { t } = useMessages();
  const { quiz } = content;
  const [answers, setAnswers] = useState<readonly (number | undefined)[]>([]);
  const [missing, setMissing] = useState(false);
  const lessonsDone = content.lessons.every((lesson) => lesson.completed);
  const result = submit.data;
  return (
    <article className={styles.lesson} aria-labelledby="learn-quiz">
      <h2 id="learn-quiz">{t('learn.quiz')}</h2>
      <p>{t('learn.quiz.lede', { count: quiz.questions.length, passMark: quiz.passMark })}</p>
      {!lessonsDone && <p className={styles.notice}>{t('learn.quiz.locked')}</p>}
      {result !== undefined && <ResultSummary result={result} />}
      <form
        className={styles.quiz}
        onSubmit={(event) => {
          event.preventDefault();
          const chosen = quiz.questions.map((_, index) => answers[index]);
          if (chosen.some((answer) => answer === undefined)) {
            setMissing(true);
            return;
          }
          setMissing(false);
          submit.mutate({ answers: chosen.map((answer) => answer ?? 0) });
        }}
      >
        {quiz.questions.map((question, index) => (
          <QuizQuestion
            key={question.id}
            question={question}
            number={index + 1}
            chosen={answers[index]}
            review={result?.questions.find((entry) => entry.id === question.id)}
            onChoose={(option) => {
              setAnswers((previous) => {
                const next = [...previous];
                next[index] = option;
                return next;
              });
            }}
          />
        ))}
        {missing && (
          <p className={styles.notice} role="alert">
            {t('learn.quiz.unanswered')}
          </p>
        )}
        <div>
          <Button type="submit" primary disabled={!lessonsDone || submit.isPending}>
            {result === undefined ? t('learn.quiz.submit') : t('learn.quiz.retry')}
          </Button>
        </div>
        {submit.isError && <ErrorNotice error={submit.error} />}
      </form>
    </article>
  );
}

function ResultSummary({ result }: { readonly result: QuizResult }) {
  const { t } = useMessages();
  const values = {
    correct: result.correct,
    total: result.questions.length,
    passMark: result.passMark,
  };
  return (
    <p className={result.passed ? styles.done : styles.notice} role="status">
      {result.passed ? t('learn.quiz.passed', values) : t('learn.quiz.failed', values)}
    </p>
  );
}

function Explanations({
  content,
  result,
}: {
  readonly content: CourseContent;
  readonly result: QuizResult;
}) {
  const { t } = useMessages();
  return (
    <ol className={styles.reviews} aria-label={t('learn.quiz.explanations')}>
      {result.questions.map((review) => {
        const question = content.quiz.questions.find((entry) => entry.id === review.id);
        return (
          <li key={review.id} lang="en">
            <p className={styles.prompt}>{question?.prompt}</p>
            <p className={styles.small}>{review.explanation}</p>
          </li>
        );
      })}
    </ol>
  );
}
