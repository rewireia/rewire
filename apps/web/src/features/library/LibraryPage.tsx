import type { Library } from '@rewire/contracts';
import { useMemo, useState } from 'react';

import { useLibrary } from '../../api/library-queries.ts';
import pageStyles from '../../app/Page.module.css';
import { usePreferences } from '../../app/preferences.ts';
import { Button } from '../../components/Button.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { formatDate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import {
  EVERY_READING,
  filterReadings,
  initialFilters,
  lastReviewed,
  type LibraryFilters as Filters,
} from './filters.ts';
import styles from './Library.module.css';
import { LibraryFilters } from './LibraryFilters.tsx';
import { ReadingCard } from './ReadingCard.tsx';

/** `/library`: public readings about AI and work, filtered in the browser, each linked. */
export function LibraryPage() {
  const { t, language } = useMessages();
  const library = useLibrary(language);
  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.intro}>
        <span className={pageStyles.eyebrow}>{t('library.eyebrow')}</span>
        <h1>{t('library.title')}</h1>
        <p className={pageStyles.lede}>{t('library.lede')}</p>
      </header>
      <QueryState query={library}>
        {(data) =>
          data.readings.length === 0 ? <EmptyLibrary /> : <LibraryReadings library={data} />
        }
      </QueryState>
    </div>
  );
}

function EmptyLibrary() {
  const { t } = useMessages();
  return (
    <section className={styles.emptyLibrary} aria-labelledby="library-empty">
      <h2 id="library-empty">{t('library.empty.title')}</h2>
      <p>{t('library.empty.body')}</p>
    </section>
  );
}

function LibraryReadings({ library }: { readonly library: Library }) {
  const { t, language } = useMessages();
  const { region } = usePreferences();
  const [filters, setFilters] = useState<Filters>(() => initialFilters(region));
  const shown = useMemo(() => filterReadings(library.readings, filters), [library, filters]);
  const reviewed = lastReviewed(library.readings);
  return (
    <section className={styles.library} aria-labelledby="library-count">
      <LibraryFilters
        readings={library.readings}
        filters={filters}
        onChange={(change) => {
          setFilters((previous) => ({ ...previous, ...change }));
        }}
      />
      <p id="library-count" className={styles.count} aria-live="polite">
        {t('library.count', { shown: shown.length, total: library.readings.length })}
      </p>
      {shown.length === 0 ? (
        <div className={styles.none}>
          <p>{t('library.none')}</p>
          <Button
            onClick={() => {
              setFilters(EVERY_READING);
            }}
          >
            {t('library.reset')}
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {shown.map((reading) => (
            <ReadingCard key={reading.id} reading={reading} />
          ))}
        </div>
      )}
      {reviewed !== null && (
        <p className={styles.notice}>
          {t('library.notice', { date: formatDate(reviewed, language) })}
        </p>
      )}
    </section>
  );
}
