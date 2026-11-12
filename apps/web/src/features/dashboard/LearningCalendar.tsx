import type { Region, RoadmapCourse } from '@rewire/contracts';
import { useState } from 'react';
import type { Language } from '../../app/preferences.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import { RoadmapCards } from './RoadmapCards.tsx';
import styles from './ControlPanel.module.css';

/** The year the roadmap is laid out on, from its first month. */
const YEAR = 2027;
const MONTHS = [0, 1, 2] as const;

type MonthName = (index: number) => string;

const dayOf = (course: RoadmapCourse) => Number(course.date.slice(8));

/** A readable month calendar for the selected roadmap, not the whole catalogue. */
export function LearningCalendar({
  courses,
  region,
}: {
  readonly courses: readonly RoadmapCourse[];
  readonly region: Region;
}) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const { month, day, chooseMonth, toggleDay } = useCalendarSelection();
  const monthName = monthNamer(language);
  const monthly = courses.filter((course) => Number(course.date.slice(5, 7)) === month + 1);
  const visible = day === null ? monthly : monthly.filter((course) => dayOf(course) === day);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2>{copy.calendar}</h2>
          <p>{copy.dates}</p>
        </div>
      </div>
      <MonthTabs month={month} monthName={monthName} onChoose={chooseMonth} />
      <div className={styles.calendarLayout}>
        <MonthGrid
          month={month}
          day={day}
          monthly={monthly}
          monthName={monthName}
          coursesLabel={copy.tabs[4] ?? ''}
          onToggle={toggleDay}
        />
        <div className={styles.agenda}>
          <h3>{day === null ? copy.month : `${day} · ${monthName(month)}`}</h3>
          {visible.length ? (
            <RoadmapCards courses={visible} region={region} />
          ) : (
            <p>{copy.nothing}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** The month on show and the day picked in it; choosing another month clears the day. */
function useCalendarSelection() {
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState<number | null>(null);
  return {
    month,
    day,
    chooseMonth: (index: number) => {
      setMonth(index);
      setDay(null);
    },
    toggleDay: (number: number) => {
      setDay(day === number ? null : number);
    },
  };
}

/** Names a month of the roadmap, such as "January 2027", in the reader's language. */
function monthNamer(language: Language): MonthName {
  const dates = new Intl.DateTimeFormat(language, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return (index) => dates.format(new Date(Date.UTC(YEAR, index, 1)));
}

function MonthTabs({
  month,
  monthName,
  onChoose,
}: {
  readonly month: number;
  readonly monthName: MonthName;
  readonly onChoose: (index: number) => void;
}) {
  return (
    <div className={styles.monthTabs}>
      {MONTHS.map((index) => (
        <button
          key={index}
          aria-pressed={month === index}
          onClick={() => {
            onChoose(index);
          }}
        >
          {monthName(index)}
        </button>
      ))}
    </div>
  );
}

/** The days of one month from Monday, each marked when a course starts on it. */
function MonthGrid({
  month,
  day,
  monthly,
  monthName,
  coursesLabel,
  onToggle,
}: {
  readonly month: number;
  readonly day: number | null;
  readonly monthly: readonly RoadmapCourse[];
  readonly monthName: MonthName;
  readonly coursesLabel: string;
  readonly onToggle: (day: number) => void;
}) {
  const { language } = useMessages();
  const first = (new Date(Date.UTC(YEAR, month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(YEAR, month + 1, 0)).getUTCDate();
  return (
    <div className={styles.calendar} aria-label={monthName(month)}>
      {Array.from({ length: 7 }, (_, index) => (
        <span className={styles.weekday} key={`w${index}`}>
          {new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' }).format(
            new Date(Date.UTC(YEAR, 0, 4 + index)),
          )}
        </span>
      ))}
      {Array.from({ length: first }, (_, index) => (
        <span key={`blank${index}`} />
      ))}
      {Array.from({ length: days }, (_, index) => {
        const number = index + 1;
        const count = monthly.filter((course) => dayOf(course) === number).length;
        return (
          <button
            key={number}
            className={styles.day}
            data-event={count > 0}
            aria-pressed={day === number}
            aria-label={`${number} ${monthName(month)}${count ? ` · ${count} ${coursesLabel}` : ''}`}
            onClick={() => {
              onToggle(number);
            }}
          >
            {number}
            {count > 0 && <span aria-hidden="true">●</span>}
          </button>
        );
      })}
    </div>
  );
}
