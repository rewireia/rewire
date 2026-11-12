import type { CatalogueCourse } from '@rewire/contracts';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';

import { DEMO_SELLER } from '../../app/seller.ts';
import { ButtonLink } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Enrolment.module.css';

/** The three steps take about four seconds together, once. */
const SEQUENCE_MS = 4000;
const STEPS = ['enrol.step.paid', 'enrol.step.seat', 'enrol.step.open'] as const;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * What follows a confirmed payment: one pass of colour through its three steps, then a card per
 * course. With reduced motion, the cards straight away.
 */
export function Enrolment({ courses }: { readonly courses: readonly CatalogueCourse[] }) {
  const [done, setDone] = useState(prefersReducedMotion);
  useEffect(() => {
    if (done) return;
    const timer = window.setTimeout(() => {
      setDone(true);
    }, SEQUENCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [done]);
  return done ? <Enrolled courses={courses} /> : <Sequence />;
}

function Sequence() {
  const { t } = useMessages();
  return (
    <section className={`navy ${styles.sequence}`} aria-labelledby="enrol-sequence" role="status">
      <p className={styles.received}>{t('enrol.received', { seller: DEMO_SELLER })}</p>
      <h2 id="enrol-sequence">{t('enrol.title')}</h2>
      <ol className={styles.steps}>
        {STEPS.map((key, index) => (
          <li key={key} className={styles.step} style={{ '--step': index } as CSSProperties}>
            <span className={styles.track} aria-hidden="true">
              <span className={styles.fill} />
            </span>
            <span className={styles.number}>{`0${index + 1}`}</span>
            <span className={styles.label}>{t(key)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Enrolled({ courses }: { readonly courses: readonly CatalogueCourse[] }) {
  const { t } = useMessages();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section className={styles.enrolled} aria-labelledby="enrol-done">
      <header className={styles.doneHead}>
        <span className={styles.eyebrow}>{t('enrol.done.eyebrow')}</span>
        <p className={styles.received}>{t('enrol.received', { seller: DEMO_SELLER })}</p>
        <h2 id="enrol-done" ref={heading} tabIndex={-1}>
          {t('enrol.done.title')}
        </h2>
        <p>{t('enrol.done.body')}</p>
      </header>
      <ul className={styles.cards}>
        {courses.map((course) => (
          <EnrolledCourse key={course.id} course={course} />
        ))}
      </ul>
      <div>
        <ButtonLink to="/courses">{t('enrol.more')}</ButtonLink>
      </div>
    </section>
  );
}

function EnrolledCourse({ course }: { readonly course: CatalogueCourse }) {
  const { t } = useMessages();
  return (
    <li className={styles.card}>
      <span className={styles.badge}>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
        {t('enrol.course.enrolled')}
      </span>
      <span className={styles.provider}>{course.provider}</span>
      <h3>{course.title}</h3>
      {course.url !== null && <p className={styles.note}>{t('enrol.course.listedNote')}</p>}
      <div className={styles.actions}>
        {course.url === null ? (
          <ButtonLink primary to={`/learn/${course.id}`}>
            {t('enrol.course.hosted')}
          </ButtonLink>
        ) : (
          <a className={styles.external} href={course.url} target="_blank" rel="noreferrer">
            {t('enrol.course.listed', { provider: course.provider })}
            <span aria-hidden="true"> ↗</span>
            <span className="visually-hidden"> ({t('courses.card.newTab')})</span>
          </a>
        )}
        <Link to="/dashboard?tab=roadmap" className={styles.panel}>
          {t('enrol.dashboard')}
        </Link>
      </div>
    </li>
  );
}
