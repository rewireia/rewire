import type { LearnerProfile, Region, RoadmapCourse } from '@rewire/contracts';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';

import { formatMoney, interpolate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { reportPath } from '../occupation/links.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import type { LearningPath as Path, Milestone } from './learning-path.ts';
import styles from './LearningPath.module.css';

type Copy = (typeof dashboardCopy)['en'];

interface PathProps {
  readonly path: Path;
  readonly profile: LearnerProfile | null;
  readonly region: Region;
  readonly courses: readonly RoadmapCourse[];
  readonly planPath: string;
  readonly today: string;
}

/**
 * "Your next steps" as a path: from the report to the certificate, each milestone with its
 * stage colour, its state and its one action. Across the page on a wide screen, down it on a
 * phone; the rail is drawn once.
 */
export function LearningPath({ path, profile, region, courses, planPath, today }: PathProps) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const { milestones, todayAt } = path;
  const last = milestones.length - 1;
  return (
    <section className={styles.path} aria-labelledby="dashboard-path">
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>{copy.pathEyebrow}</p>
          <h2 id="dashboard-path">{copy.next}</h2>
        </div>
        <Link to="?tab=roadmap" className={styles.inTime}>
          {copy.openRoadmap}
        </Link>
      </header>
      <ol className={styles.track} style={{ '--steps': milestones.length } as CSSProperties}>
        {milestones.map((milestone, index) => (
          <li
            key={milestone.id}
            className={styles.step}
            data-stage={milestone.stage}
            data-state={milestone.state}
            data-last={index === last || undefined}
            aria-current={milestone.state === 'next' ? 'step' : undefined}
            style={{ '--index': index } as CSSProperties}
          >
            {(index === todayAt || (index === last && todayAt > last)) && (
              <TodayMark today={today} end={todayAt > last} />
            )}
            <span className={styles.node} aria-hidden="true">
              {milestone.state === 'done' ? <Check /> : String(index + 1).padStart(2, '0')}
            </span>
            {index < last && <span className={styles.rail} aria-hidden="true" />}
            <MilestoneCard
              milestone={milestone}
              copy={copy}
              profile={profile}
              region={region}
              courses={courses}
              planPath={planPath}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function TodayMark({ today, end }: { readonly today: string; readonly end: boolean }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const day = new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${today}T12:00:00Z`));
  return (
    <span className={styles.today} data-end={end || undefined}>
      <span>
        {copy.today} · {day}
      </span>
    </span>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  );
}

interface CardProps {
  readonly milestone: Milestone;
  readonly copy: Copy;
  readonly profile: LearnerProfile | null;
  readonly region: Region;
  readonly courses: readonly RoadmapCourse[];
  readonly planPath: string;
}

/** What a milestone says: its stage, title, detail, state and action. */
interface CardText {
  readonly title: string;
  readonly detail: string;
  readonly meta?: string;
  readonly tag?: string;
  readonly action: { readonly label: string; readonly to: string } | null;
}

function MilestoneCard(props: CardProps) {
  const { language } = useMessages();
  const { milestone, copy } = props;
  const text = cardText(props, language);
  const tag =
    milestone.state === 'next'
      ? copy.nextStep
      : milestone.state === 'done' && milestone.kind !== 'course'
        ? copy.completed
        : text.tag;
  return (
    <article className={styles.card}>
      <p className={styles.stage}>
        {copy.stages[milestone.stage]}
        {milestone.date !== null && <span> · {longDay(milestone.date, language)}</span>}
      </p>
      <h3>{text.title}</h3>
      <p className={styles.detail}>{text.detail}</p>
      {text.meta !== undefined && <p className={styles.meta}>{text.meta}</p>}
      {tag !== undefined && <span className={styles.tag}>{tag}</span>}
      {text.action !== null && (
        <Link to={text.action.to} className={styles.action}>
          {text.action.label}
        </Link>
      )}
    </article>
  );
}

function longDay(date: string, language: 'en' | 'es'): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

function cardText(props: CardProps, language: 'en' | 'es'): CardText {
  const { milestone, copy, profile, region, courses, planPath } = props;
  const done = milestone.state === 'done';
  switch (milestone.kind) {
    case 'report':
      return profile === null
        ? {
            title: copy.reportTodo,
            detail: copy.reportBody,
            action: { label: copy.tellRex, to: '/start' },
          }
        : {
            title: copy.reportDone,
            detail: profile.occupation.title,
            action: {
              label: copy.seeReport,
              to: reportPath(profile.region, profile.occupation.isco08, profile.occupation),
            },
          };
    case 'plan': {
      const kept = courses.filter((course) => course.status !== 'revoked');
      const hours = kept.map((course) => course.hours);
      const summary = hours.every((value) => value !== null)
        ? interpolate(
            copy.planSummary,
            { count: kept.length, hours: hours.reduce((sum, value) => sum + value, 0) },
            language,
          )
        : interpolate(copy.planCount, { count: kept.length }, language);
      return {
        title: done ? copy.planDone : copy.planTodo,
        detail: done ? summary : copy.planBody,
        action: { label: done ? copy.openPlan : copy.planAction, to: planPath },
      };
    }
    case 'courses':
      return {
        title: copy.coursesTodo,
        detail: copy.coursesBody,
        action: { label: copy.findCourses, to: '/courses' },
      };
    case 'course':
      return courseText(milestone.course, milestone.certificateId, copy, region, language);
    case 'goal':
      return {
        title: copy.goal,
        detail: copy.goalBody,
        action:
          milestone.certificateId !== null
            ? { label: copy.certificate, to: `/certificates/${milestone.certificateId}` }
            : { label: copy.openRoadmap, to: '?tab=roadmap' },
      };
  }
}

function courseText(
  course: RoadmapCourse,
  certificateId: string | null,
  copy: Copy,
  region: Region,
  language: 'en' | 'es',
): CardText {
  const page = `/${region}/courses/${course.courseId}`;
  const learn = `/learn/${course.courseId}`;
  const action =
    course.status === 'selected'
      ? { label: copy.getCourse, to: page }
      : course.status === 'active'
        ? { label: copy.learn, to: learn }
        : course.status === 'completed' && certificateId !== null
          ? { label: copy.certificate, to: `/certificates/${certificateId}` }
          : { label: copy.view, to: course.status === 'completed' ? learn : page };
  return {
    title: course.title,
    detail:
      course.hours === null
        ? copy.hoursUnknown
        : interpolate(copy.hours, { hours: course.hours }, language),
    meta: formatMoney(course.price, language),
    tag: copy[course.status],
    action,
  };
}
