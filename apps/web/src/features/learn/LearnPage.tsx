import { useParams } from 'react-router';

import { useCourseContent, useListedEnrolment } from '../../api/learning-queries.ts';
import { problemCode } from '../../api/request.ts';
import pageStyles from '../../app/Page.module.css';
import { usePreferences } from '../../app/preferences.ts';
import { ButtonLink } from '../../components/Button.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { LearnView } from './LearnView.tsx';
import { ListedCourseView } from './ListedCourseView.tsx';

function NotEnrolled() {
  const { t } = useMessages();
  const { occupation } = usePreferences();
  return (
    <header className={pageStyles.intro}>
      <h1>{t('learn.notEnrolled')}</h1>
      <p className={pageStyles.lede}>{t('learn.notEnrolled.body')}</p>
      {occupation === null ? (
        <ButtonLink to="/start">{t('learn.toHome')}</ButtonLink>
      ) : (
        <ButtonLink to={`/${occupation.region}/plan/${occupation.isco08}`}>
          {t('learn.toPlan')}
        </ButtonLink>
      )}
    </header>
  );
}

/**
 * `/learn/:courseId`: a course the learner is enrolled in, lesson by lesson. A course Rewire
 * does not host is a listed one, taken at its provider: the page then says so and links to it.
 */
export function LearnPage() {
  const courseId = useParams().courseId ?? '';
  const content = useCourseContent(courseId);
  const code = problemCode(content.error);
  const listed = useListedEnrolment(courseId, code === 'not_found');
  const listedCode = problemCode(listed.error);
  const notEnrolled =
    code === 'no_session' || listedCode === 'not_found' || listedCode === 'no_session';
  return (
    <div className={pageStyles.page}>
      {notEnrolled ? (
        <NotEnrolled />
      ) : code === 'not_found' ? (
        <QueryState query={listed}>
          {(enrolment) => <ListedCourseView enrolment={enrolment} />}
        </QueryState>
      ) : (
        <QueryState query={content}>{(data) => <LearnView content={data} />}</QueryState>
      )}
    </div>
  );
}
