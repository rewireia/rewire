import type { CourseCatalogue } from '@rewire/contracts';
import { useMemo } from 'react';

import { useCourseCatalogue } from '../../api/courses-queries.ts';
import { useActiveOffer, type RunningOffer } from '../../api/offers-queries.ts';
import pageStyles from '../../app/Page.module.css';
import { usePreferences } from '../../app/preferences.ts';
import { DEMO_SELLER } from '../../app/seller.ts';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { OfferBand } from '../offers/OfferBand.tsx';

import { CourseBrowser } from './CourseBrowser.tsx';
import styles from './Courses.module.css';
import { RexFinder } from './RexFinder.tsx';

/** `/courses`: the catalogue of the region, with Rex to search it and filters to browse it. */
export function CoursesPage() {
  const { t, language } = useMessages();
  const { region } = usePreferences();
  const catalogue = useCourseCatalogue(region, language);
  const offer = useActiveOffer(region);
  return (
    <div className={pageStyles.page}>
      <header className={`navy ${styles.hero}`}>
        <span className={styles.eyebrow}>{t('courses.eyebrow')}</span>
        <h1>{t('courses.title')}</h1>
        <p className={styles.lede}>{t('courses.lede')}</p>
        <p className={styles.truth}>
          <span>{t('courses.truth.label')}</span>
          {t('courses.truth', { seller: DEMO_SELLER })}
        </p>
      </header>
      {offer !== null && <OfferBand offer={offer} />}
      <QueryState query={catalogue} loadingLabel={t('courses.loading')}>
        {(data) => <Shop catalogue={data} offer={offer} />}
      </QueryState>
    </div>
  );
}

function Shop({
  catalogue,
  offer,
}: {
  readonly catalogue: CourseCatalogue;
  readonly offer: RunningOffer | null;
}) {
  const courses = useMemo(
    () => new Map(catalogue.courses.map((course) => [course.id, course])),
    [catalogue],
  );
  const topics = useMemo(
    () => new Map(catalogue.topics.map((topic) => [topic.id, topic])),
    [catalogue],
  );
  return (
    <>
      <RexFinder catalogue={catalogue} courses={courses} topics={topics} />
      <CourseBrowser catalogue={catalogue} topics={topics} offer={offer} />
    </>
  );
}
