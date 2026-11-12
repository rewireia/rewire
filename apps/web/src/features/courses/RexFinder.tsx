import type {
  CatalogueCourse,
  CatalogueSearchResult,
  CourseCatalogue,
  CourseTopic,
} from '@rewire/contracts';
import { useState, type KeyboardEvent, type ReactNode, type SubmitEvent } from 'react';

import { useCourseSearch } from '../../api/courses-queries.ts';
import { Button } from '../../components/Button.tsx';
import { Mark } from '../../components/Mark.tsx';
import { useMessages, type Messages } from '../../i18n/use-messages.ts';
import { GuidePrivacy } from '../guide/GuidePrivacy.tsx';
import rex from '../journey/RexChat.module.css';

import { CourseCard } from './CourseCard.tsx';
import { rexReply } from './rex-reply.ts';
import styles from './RexFinder.module.css';

/** The shortest and longest request the course guide reads. */
const MIN_QUERY = 3;
const MAX_QUERY = 400;
/** The most proposals the server can be asked to leave out. */
const MAX_EXCLUDED = 30;

interface Proposal {
  readonly course: CatalogueCourse;
  readonly reason: string | null;
}

/** One question and Rex's answer to it; asking for others keeps the question. */
interface Exchange {
  readonly query: string;
  readonly again: boolean;
  /** Every course proposed for this question so far, so that others come next. */
  readonly seen: readonly string[];
  readonly answer:
    | { readonly status: 'pending' }
    | {
        readonly status: 'done';
        readonly result: CatalogueSearchResult | null;
        readonly proposals: readonly Proposal[];
      };
}

/** The proposals of a result that are in the catalogue the page shows, in the server's order. */
function proposalsOf(
  result: CatalogueSearchResult,
  courses: ReadonlyMap<string, CatalogueCourse>,
): readonly Proposal[] {
  return result.matches.flatMap((match) => {
    const course = courses.get(match.courseId);
    return course === undefined ? [] : [{ course, reason: match.reason }];
  });
}

interface RexFinderProps {
  readonly catalogue: CourseCatalogue;
  readonly courses: ReadonlyMap<string, CatalogueCourse>;
  readonly topics: ReadonlyMap<string, CourseTopic>;
}

/** One search at a time: the question, then the server's proposals found in the catalogue. */
function useRexSearch(catalogue: CourseCatalogue, courses: ReadonlyMap<string, CatalogueCourse>) {
  const { language } = useMessages();
  const search = useCourseSearch();
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const ask = (query: string, seen: readonly string[], again: boolean) => {
    const settle = (result: CatalogueSearchResult | null) => {
      const proposals = result === null ? [] : proposalsOf(result, courses);
      const ids = proposals.map(({ course }) => course.id);
      setExchange({
        query,
        again,
        seen: [...seen, ...ids],
        answer: { status: 'done', result, proposals },
      });
    };
    setExchange({ query, again, seen, answer: { status: 'pending' } });
    search.mutate(
      { region: catalogue.region, language, query, exclude: seen.slice(-MAX_EXCLUDED) },
      {
        onSuccess: settle,
        onError: () => {
          settle(null);
        },
      },
    );
  };
  return { exchange, ask };
}

/** Rex, who reads what the person wants to learn and proposes real courses of the catalogue. */
export function RexFinder({ catalogue, courses, topics }: RexFinderProps) {
  const { t } = useMessages();
  const { exchange, ask } = useRexSearch(catalogue, courses);
  return (
    <section className={styles.finder} aria-labelledby="rex-finder-title">
      <header className={styles.head}>
        <span className={rex.headerMark} aria-hidden="true">
          <Mark size={24} />
        </span>
        <div>
          <h2 id="rex-finder-title">Rex</h2>
          <p>{t('courses.rex.subtitle')}</p>
        </div>
      </header>
      <div className={styles.transcript}>
        <RexSays>
          <p>{t('courses.rex.greeting')}</p>
          <p>{t('courses.rex.ask')}</p>
        </RexSays>
        <p className="visually-hidden" aria-live="polite">
          {exchange === null ? '' : spoken(exchange, t)}
        </p>
        {exchange !== null && (
          <ExchangeView
            exchange={exchange}
            catalogue={catalogue}
            topics={topics}
            onAgain={() => {
              ask(exchange.query, exchange.seen, true);
            }}
          />
        )}
      </div>
      <RexAsk
        pending={exchange?.answer.status === 'pending'}
        onSend={(query) => {
          ask(query, [], false);
        }}
      />
    </section>
  );
}

interface ExchangeViewProps {
  readonly exchange: Exchange;
  readonly catalogue: CourseCatalogue;
  readonly topics: ReadonlyMap<string, CourseTopic>;
  readonly onAgain: () => void;
}

/** The person's words, Rex looking or answering, and the courses Rex proposes. */
function ExchangeView({ exchange, catalogue, topics, onAgain }: ExchangeViewProps) {
  const { t } = useMessages();
  const { answer } = exchange;
  return (
    <>
      <div className={rex.personRow}>
        <p className={rex.personBubble}>{exchange.query}</p>
      </div>
      {answer.status === 'pending' ? (
        <Thinking />
      ) : (
        <RexAnswer result={answer.result} shown={answer.proposals.length} again={exchange.again} />
      )}
      {answer.status === 'done' && answer.proposals.length > 0 && (
        <div className={styles.proposals}>
          <h3 className="visually-hidden">{t('courses.rex.results')}</h3>
          {answer.proposals.map(({ course, reason }) => (
            <CourseCard
              key={course.id}
              region={catalogue.region}
              course={course}
              topics={topics}
              reason={reason}
            />
          ))}
          <div>
            <Button arrow onClick={onAgain}>
              {t('courses.rex.again')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function RexSays({ children }: { readonly children: ReactNode }) {
  return (
    <div className={rex.messageRow}>
      <span className={rex.avatar} aria-hidden="true">
        <Mark size={20} />
      </span>
      <div className={rex.messageBody}>
        <span className={rex.author}>Rex</span>
        <div className={`${rex.bubble} ${styles.bubble}`}>{children}</div>
      </div>
    </div>
  );
}

/** What a screen reader hears of an exchange: that Rex is looking, then Rex's whole answer. */
function spoken(exchange: Exchange, t: Messages['t']): string {
  const { answer } = exchange;
  if (answer.status === 'pending') {
    return t('courses.rex.thinking');
  }
  const reply = rexReply(answer.result, answer.proposals.length, exchange.again);
  const sentence = t(reply.key, { count: reply.count });
  return reply.byRules ? `${sentence} ${t('courses.rex.reply.rules')}` : sentence;
}

/** Rex's sentence about the answer, written by the page from what the server returned. */
function RexAnswer({
  result,
  shown,
  again,
}: {
  readonly result: CatalogueSearchResult | null;
  readonly shown: number;
  readonly again: boolean;
}) {
  const { t } = useMessages();
  const reply = rexReply(result, shown, again);
  return (
    <RexSays>
      <p>{t(reply.key, { count: reply.count })}</p>
      {reply.byRules && <p className={styles.aside}>{t('courses.rex.reply.rules')}</p>}
    </RexSays>
  );
}

/** One pass of colour along a fine line while Rex looks; with reduced motion it is full. */
function Thinking() {
  const { t } = useMessages();
  return (
    <div className={rex.messageRow}>
      <span className={rex.avatar} aria-hidden="true">
        <Mark size={20} />
      </span>
      <div className={styles.thinking}>
        <p>{t('courses.rex.thinking')}</p>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.fill} />
        </span>
      </div>
    </div>
  );
}

/** The question, in the person's words, and where those words go. */
function RexAsk({
  pending,
  onSend,
}: {
  readonly pending: boolean;
  readonly onSend: (text: string) => void;
}) {
  const { t } = useMessages();
  const [text, setText] = useState('');
  const ready = text.trim().length >= MIN_QUERY && !pending;
  const send = () => {
    if (!ready) return;
    onSend(text.trim());
    setText('');
  };
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    send();
  };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };
  return (
    <form className={`${rex.composer} ${styles.composer}`} onSubmit={submit}>
      <div className={rex.inputRow}>
        <label className="visually-hidden" htmlFor="courses-rex">
          {t('courses.rex.label')}
        </label>
        <textarea
          id="courses-rex"
          rows={2}
          maxLength={MAX_QUERY}
          value={text}
          placeholder={t('courses.rex.placeholder')}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={keyDown}
        />
        <button type="submit" disabled={!ready}>
          {t('courses.rex.send')}
        </button>
      </div>
      <GuidePrivacy className={`${rex.privacy} ${styles.privacy}`} />
    </form>
  );
}
