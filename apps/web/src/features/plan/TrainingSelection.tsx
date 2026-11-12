import type { CourseRecommendations, CourseSearchInput, Region } from '@rewire/contracts';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useState } from 'react';
import { api } from '../../api/instance.ts';
import { useWallet } from '../../api/marketplace-queries.ts';
import { formatMoney } from '../../i18n/format.ts';
import { useSession } from '../../api/queries.ts';
import { ButtonLink } from '../../components/Button.tsx';
import { LoadingBar } from '../../components/LoadingBar.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { TrainingQuestions } from './TrainingQuestions.tsx';
import { TrainingResults } from './TrainingResults.tsx';
import { trainingCopy } from './training-copy.ts';
import styles from './TrainingSelection.module.css';

/** What the questions start from: a budget of 100, starting out, two hours a week. */
const FIRST_ANSWERS = {
  budget: 100,
  level: 'beginner',
  goal: 'current-job',
  weeklyHours: 2,
} as const;

interface Answers {
  readonly budget: number;
  readonly level: CourseSearchInput['level'];
  readonly goal: CourseSearchInput['goal'];
  readonly weeklyHours: number;
}

/** Questions, one real catalogue search, three suggestions and a fixed-price basket. */
export function TrainingSelection({
  region,
  isco08,
}: {
  readonly region: Region;
  readonly isco08: string;
}) {
  const { language, t } = useMessages();
  const copy = trainingCopy[language];
  const session = useSession();
  const [answers, setAnswers] = useState<Answers>(FIRST_ANSWERS);
  const [result, setResult] = useState<CourseRecommendations | null>(null);
  const [editing, setEditing] = useState(true);
  const search = useCourseSearch(region, isco08, answers, (data) => {
    setResult(data);
    setEditing(false);
  });
  if (session.isPending) return <LoadingBar />;
  if (!session.data?.authenticated || session.data.accessRole !== 'learner')
    return <SignInFirst next={`/${region}/plan/${isco08}`} />;
  return (
    <div className={styles.flow} aria-busy={search.isPending}>
      {editing && <WalletNote region={region} />}
      {editing && (
        <TrainingQuestions
          region={region}
          answers={answers}
          onChange={setAnswers}
          disabled={search.isPending}
          onSearch={() => {
            search.mutate([]);
          }}
        />
      )}
      {search.isPending && <LoadingBar label={t('market.wait.courses')} />}
      {search.isError && (
        <p role="alert" className={styles.notice}>
          {copy.failure}
        </p>
      )}
      {!editing && result && (
        <TrainingResults
          key={result.courses.map((course) => course.courseId).join(',')}
          region={region}
          result={result}
          busy={search.isPending}
          onEdit={() => {
            setEditing(true);
            search.reset();
          }}
          onAgain={() => {
            search.mutate(result.courses.map((course) => course.courseId));
          }}
        />
      )}
    </div>
  );
}

/** What the wallet holds, and the way to add funds; the search never depends on it. */
function WalletNote({ region }: { readonly region: Region }) {
  const { language } = useMessages();
  const copy = trainingCopy[language];
  const wallet = useWallet(region);
  if (!wallet.data) return null;
  const { availableMinor, currency } = wallet.data;
  return (
    <p className={styles.notice}>
      {availableMinor === 0
        ? copy.walletEmpty
        : copy.walletBalance.replace(
            '{amount}',
            formatMoney({ currency, minorUnits: availableMinor }, language),
          )}{' '}
      <Link to="/dashboard?tab=wallet">{copy.walletLink}</Link>
    </p>
  );
}

/** One real catalogue search; the budget bounds it, and paying uses PayPal or the real wallet. */
function useCourseSearch(
  region: Region,
  isco08: string,
  answers: Answers,
  onFound: (result: CourseRecommendations) => void,
) {
  const { language } = useMessages();
  return useMutation({
    mutationFn: (exclude: string[]) =>
      api.recommendCourses({
        region,
        isco08,
        language,
        budgetMinor: Math.round(answers.budget * 100),
        level: answers.level,
        goal: answers.goal,
        weeklyHours: answers.weeklyHours,
        exclude,
      }),
    onSuccess: onFound,
  });
}

/** The plan's training is the signed-in learner's: the way to sign in, and back here. */
function SignInFirst({ next }: { readonly next: string }) {
  const { t } = useMessages();
  return (
    <section className={styles.section}>
      <p>{t('market.signInTraining')}</p>
      <ButtonLink to={`/dashboard?${new URLSearchParams({ next })}`}>
        {t('access.signIn')}
      </ButtonLink>
    </section>
  );
}
