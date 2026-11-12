import type { Region } from '@rewire/contracts';
import { Link } from 'react-router';

import { useLibrary } from '../../api/library-queries.ts';
import { interpolate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import { readingsFor } from './reading-picks.ts';
import styles from './Overview.module.css';

/** Two or three public readings for the learner's region, with the way to the library. */
export function ForYou({ region }: { readonly region: Region }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const library = useLibrary(language);
  const readings = library.data === undefined ? [] : readingsFor(library.data.readings, region);
  if (readings.length === 0) {
    return null;
  }
  return (
    <section className={styles.forYou} aria-labelledby="dashboard-for-you">
      <header className={styles.cardHead}>
        <p className={styles.eyebrow}>{copy.forYouEyebrow}</p>
        <h2 id="dashboard-for-you">{copy.forYou}</h2>
        <Link to="/library" className={styles.more}>
          {copy.library}
        </Link>
      </header>
      <ul className={styles.readings}>
        {readings.map((reading) => (
          <li key={reading.id}>
            <p className={styles.lineMeta}>
              {reading.source} · {reading.year}
            </p>
            <a href={reading.url} target="_blank" rel="noopener noreferrer">
              {reading.title}
            </a>
            <p className={styles.readingWhy}>{reading.why}</p>
            <p className={styles.lineMeta}>
              {interpolate(copy.minutes, { minutes: reading.minutes }, language)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
