import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/instance.ts';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import type { CourseRecommendations, Region, TrainingCourse } from '@rewire/contracts';
import { useState } from 'react';
import { Button, ButtonLink } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { formatMoney } from '../../i18n/format.ts';
import { TrainingCheckout } from './TrainingCheckout.tsx';
import { trainingCopy } from './training-copy.ts';
import styles from './TrainingSelection.module.css';

interface Props {
  readonly region: Region;
  readonly result: CourseRecommendations;
  readonly busy: boolean;
  readonly onEdit: () => void;
  readonly onAgain: () => void;
}
type Copy = (typeof trainingCopy)[keyof typeof trainingCopy];

/** The recommended courses to pick from, then their checkout, then a way to the dashboard. */
export function TrainingResults({ region, result, busy, onEdit, onAgain }: Props) {
  const { language } = useMessages();
  const copy = trainingCopy[language];
  const { selected, toggle } = useSelection();
  const [checkout, setCheckout] = useState(false);
  const [completed, setCompleted] = useState(false);
  const save = useSaveRoadmap(region, selected, () => {
    setCheckout(true);
  });
  const courses = result.courses.filter((course) => selected.includes(course.courseId));
  if (completed) return <TrainingCompleted copy={copy} />;
  if (checkout)
    return (
      <TrainingCheckout
        region={region}
        courses={courses}
        onBack={() => {
          setCheckout(false);
        }}
        onCompleted={() => {
          setCompleted(true);
        }}
      />
    );
  return (
    <section className={styles.flow}>
      <header className={styles.resultIntro}>
        <span className={styles.tag}>{copy.demo}</span>
        <h2>{copy.results}</h2>
        <p>{copy.resultsBody}</p>
      </header>
      {result.engine === 'rules' && <p className={styles.notice}>{copy.rules}</p>}
      <CourseChoices
        courses={result.courses}
        selected={selected}
        disabled={busy}
        onToggle={toggle}
      />
      <SelectionBasket
        copy={copy}
        currency={result.courses[0]?.currency ?? 'USD'}
        courses={courses}
        disabled={busy || save.isPending || courses.length === 0}
        onCheckout={() => {
          save.mutate();
        }}
      />
      {save.isError && <ErrorNotice error={save.error} />}
      <div className={styles.actions}>
        <Button disabled={busy} onClick={onEdit}>
          {copy.change}
        </Button>
        <Button disabled={busy} onClick={onAgain}>
          {copy.again}
        </Button>
      </div>
    </section>
  );
}

/** The ids of the courses picked so far; picking one again leaves it out. */
function useSelection() {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (courseId: string) => {
    setSelected((values) =>
      values.includes(courseId) ? values.filter((id) => id !== courseId) : [...values, courseId],
    );
  };
  return { selected, toggle };
}

/** Keeps the picked courses as the roadmap, so the dashboard shows them, before paying. */
function useSaveRoadmap(region: Region, selected: readonly string[], onSaved: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.saveRoadmap(region, [...selected]),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['roadmap'] });
      onSaved();
    },
  });
}

function TrainingCompleted({ copy }: { readonly copy: Copy }) {
  return (
    <section className={styles.section}>
      <h2>{copy.completed}</h2>
      <ButtonLink primary to="/dashboard">
        {copy.dashboard} →
      </ButtonLink>
    </section>
  );
}

function SelectionBasket({
  copy,
  currency,
  courses,
  disabled,
  onCheckout,
}: {
  readonly copy: Copy;
  readonly currency: TrainingCourse['currency'];
  readonly courses: readonly TrainingCourse[];
  readonly disabled: boolean;
  readonly onCheckout: () => void;
}) {
  const { language } = useMessages();
  const minorUnits = courses.reduce((sum, course) => sum + course.priceMinor, 0);
  return (
    <div className={styles.basket}>
      <div>
        <span>
          {copy.total} · {courses.length}/3
        </span>
        <strong>{formatMoney({ currency, minorUnits }, language)}</strong>
      </div>
      <Button primary disabled={disabled} onClick={onCheckout}>
        {copy.checkout} →
      </Button>
    </div>
  );
}

/** The recommended courses in plan order, one month each, to tick or untick. */
function CourseChoices({
  courses,
  selected,
  disabled,
  onToggle,
}: {
  readonly courses: readonly TrainingCourse[];
  readonly selected: readonly string[];
  readonly disabled: boolean;
  readonly onToggle: (courseId: string) => void;
}) {
  return (
    <div className={styles.list}>
      {courses.map((course, index) => (
        <CourseChoice
          key={course.courseId}
          course={course}
          month={index}
          selected={selected.includes(course.courseId)}
          disabled={disabled}
          onToggle={() => {
            onToggle(course.courseId);
          }}
        />
      ))}
    </div>
  );
}

function CourseChoice({
  course,
  month,
  selected,
  disabled,
  onToggle,
}: {
  readonly course: TrainingCourse;
  readonly month: number;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly onToggle: () => void;
}) {
  const { language } = useMessages();
  const copy = trainingCopy[language];
  return (
    <label className={styles.choice} data-selected={selected}>
      <div className={styles.cardHead}>
        <span className={styles.month}>
          {new Intl.DateTimeFormat(language, {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(new Date(Date.UTC(2027, month, 1)))}
        </span>
        <span>{course.hours} h</span>
      </div>
      <h3>{course.title}</h3>
      <p>{course.summary}</p>
      <strong className={styles.price}>
        {formatMoney({ currency: course.currency, minorUnits: course.priceMinor }, language)}
      </strong>
      <span className={styles.select}>
        <input type="checkbox" checked={selected} disabled={disabled} onChange={onToggle} />
        {selected ? copy.selected : copy.select}
      </span>
    </label>
  );
}
