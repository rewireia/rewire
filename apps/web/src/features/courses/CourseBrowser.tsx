import type { CourseCatalogue, CourseTopic } from '@rewire/contracts';
import { useDeferredValue, useMemo, useState } from 'react';

import type { RunningOffer } from '../../api/offers-queries.ts';
import { Button } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { BROWSE_ANCHOR } from '../offers/offer-terms.ts';

import { CourseCard } from './CourseCard.tsx';
import { Filters } from './CourseFilters.tsx';
import {
  catalogueLanguages,
  filterCourses,
  NO_FILTER,
  type CourseFilter,
} from './course-filter.ts';
import styles from './Courses.module.css';
import { useOfferFilter } from './use-offer-filter.ts';

/** Courses drawn at once, and how many more each "Show more" adds. */
const BATCH = 24;

interface CourseBrowserProps {
  readonly catalogue: CourseCatalogue;
  readonly topics: ReadonlyMap<string, CourseTopic>;
  /** The seller's running offer in the region, which brings the "On offer" filter. */
  readonly offer: RunningOffer | null;
}

/** The whole catalogue, searched and filtered in the browser, drawn in batches. */
export function CourseBrowser({ catalogue, topics, offer }: CourseBrowserProps) {
  const { t, language } = useMessages();
  const offerFilter = useOfferFilter(offer);
  const languages = useMemo(() => catalogueLanguages(catalogue.courses), [catalogue]);
  // In a catalogue of several languages, the courses in the person's language come first.
  const [filter, setFilter] = useState<CourseFilter>(() => ({
    ...NO_FILTER,
    language: languages.length > 1 && languages.includes(language) ? language : null,
  }));
  const [batches, setBatches] = useState(1);
  const deferred = useDeferredValue(filter);
  const { onOffer } = offerFilter;
  const found = useMemo(
    () => filterCourses(catalogue.courses, catalogue.topics, { ...deferred, onOffer }),
    [catalogue, deferred, onOffer],
  );
  const change = ({ onOffer: offerAsked, ...next }: Partial<CourseFilter>) => {
    if (offerAsked !== undefined) offerFilter.set(offerAsked);
    setFilter((previous) => ({ ...previous, ...next }));
    setBatches(1);
  };
  const shown = found.slice(0, batches * BATCH);
  return (
    <section className={styles.browser} aria-labelledby={BROWSE_ANCHOR}>
      <div className={styles.browseHead}>
        <h2 id={BROWSE_ANCHOR}>{t('courses.browse.title')}</h2>
        <p className={styles.count} aria-live="polite">
          {t('courses.count', { shown: shown.length, total: found.length })}
        </p>
      </div>
      <Filters
        catalogue={catalogue}
        languages={languages}
        filter={{ ...filter, onOffer }}
        offered={offer !== null}
        onChange={change}
      />
      {found.length === 0 ? (
        <p className={styles.empty}>{t('courses.empty')}</p>
      ) : (
        <div className={styles.list}>
          {shown.map((course) => (
            <CourseCard key={course.id} region={catalogue.region} course={course} topics={topics} />
          ))}
        </div>
      )}
      {shown.length < found.length && (
        <div className={styles.more}>
          <Button
            onClick={() => {
              setBatches((count) => count + 1);
            }}
          >
            {t('courses.more')}
          </Button>
        </div>
      )}
    </section>
  );
}
