import type { StudyPlan } from '@rewire/contracts';
import { useId, useState, type KeyboardEvent } from 'react';

import { useMessages } from '../../i18n/use-messages.ts';

import {
  BOOKED_DAYS,
  isBookable,
  isPlanDay,
  PLAN_DAYS,
  withBookedDays,
  withNotBefore,
} from './plan-changes.ts';
import styles from './PlanList.module.css';

interface FieldProps {
  readonly courseId: string;
  readonly plan: StudyPlan;
  /** While a change is saved, a field sends no other. */
  readonly busy: boolean;
  readonly onChange: (plan: StudyPlan) => void;
}

/** A field is saved when the person leaves it or presses Enter, once it holds a valid value. */
const onEnter = (commit: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    commit();
  }
};

/** "Start no earlier than": the day before which the course may not start; empty lets it follow. */
export function NotBeforeField({ courseId, plan, busy, onChange }: FieldProps) {
  const { t } = useMessages();
  const id = useId();
  const saved = plan.notBefore[courseId] ?? '';
  const [draft, setDraft] = useState(saved);
  const commit = () => {
    if (busy || draft === saved || (draft !== '' && !isPlanDay(draft))) {
      return;
    }
    onChange(withNotBefore(plan, courseId, draft === '' ? null : draft));
  };
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{t('timeline.list.notBefore')}</label>
      <input
        id={id}
        type="date"
        className={styles.input}
        min={PLAN_DAYS.first}
        max={PLAN_DAYS.last}
        value={draft}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={onEnter(commit)}
      />
      <span id={`${id}-hint`} className="visually-hidden">
        {t('timeline.list.notBeforeHint')}
      </span>
    </div>
  );
}

interface BookedDaysProps extends FieldProps {
  /** The days the course takes now: the learner's own or Rewire's default. */
  readonly booked: number;
}

/** "Days booked": the length of a course whose provider publishes none, from 1 to 180 days. */
export function BookedDaysField({ courseId, booked, plan, busy, onChange }: BookedDaysProps) {
  const { t } = useMessages();
  const id = useId();
  const [draft, setDraft] = useState(String(booked));
  const commit = () => {
    const days = Number(draft);
    if (busy || days === booked || !isBookable(days)) {
      return;
    }
    onChange(withBookedDays(plan, courseId, days));
  };
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{t('timeline.list.days')}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        className={styles.input}
        min={BOOKED_DAYS.min}
        max={BOOKED_DAYS.max}
        step={1}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={onEnter(commit)}
      />
    </div>
  );
}
