import type { CourseSourceList, DataSource } from '@rewire/contracts';

import { useCourseSources } from '../../api/courses-queries.ts';

import { useSources } from '../../api/queries.ts';
import { COVER } from '../../assets/cover.ts';
import pageStyles from '../../app/Page.module.css';
import { QueryState } from '../../components/QueryState.tsx';
import { formatDate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Credits.module.css';

function SourceEntry({ source }: { readonly source: DataSource }) {
  const { t, language } = useMessages();
  return (
    <li className={styles.source}>
      <h3>
        <a href={source.url} rel="noreferrer" target="_blank">
          {source.title}
        </a>
      </h3>
      <dl className={styles.facts}>
        <dt>{t('method.source.publisher')}</dt>
        <dd>{source.publisher}</dd>
        <dt>{t('method.source.version')}</dt>
        <dd>{source.version}</dd>
        <dt>{t('method.source.licence')}</dt>
        <dd>
          <a href={source.licence.url} rel="noreferrer" target="_blank">
            {source.licence.name}
          </a>
        </dd>
        <dt>{t('method.source.retrieved')}</dt>
        <dd>
          <time dateTime={source.retrievedOn}>{formatDate(source.retrievedOn, language)}</time>
        </dd>
        <dt>{t('method.source.attribution')}</dt>
        <dd lang="en">{source.attribution}</dd>
        {source.adaptationNotice !== null && (
          <>
            <dt>{t('method.source.adaptation')}</dt>
            <dd lang="en">{source.adaptationNotice}</dd>
          </>
        )}
      </dl>
    </li>
  );
}

type CourseSource = CourseSourceList['sources'][number];

function CourseSourceEntry({ source }: { readonly source: CourseSource }) {
  const { t, language } = useMessages();
  const values = {
    provider: source.provider ?? '',
    courses: source.courses,
    providers: source.providers,
  };
  return (
    <li className={styles.source}>
      <p>
        {source.source === null ? (
          t(`courseSources.${source.kind}`, values)
        ) : (
          <a href={source.source} rel="noreferrer" target="_blank">
            {t(`courseSources.${source.kind}`, values)}
          </a>
        )}
      </p>
      {source.citation !== null && <p>{source.citation}</p>}
      <p className={styles.links}>
        <time dateTime={source.capturedOn}>
          {t('courseSources.date', { date: formatDate(source.capturedOn, language) })}
        </time>
      </p>
    </li>
  );
}

/** Where the listed courses come from, as the server reports it, with each citation. */
function CourseCatalogueSources() {
  const { t } = useMessages();
  const sources = useCourseSources();
  return (
    <section className={pageStyles.section} aria-labelledby="credits-courses">
      <h2 id="credits-courses">{t('courseSources.title')}</h2>
      <p className={styles.note}>{t('courseSources.lede')}</p>
      <QueryState query={sources}>
        {({ sources: list }) => (
          <ul className={styles.sources}>
            {list.map((source) => (
              <CourseSourceEntry key={source.kind} source={source} />
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
}

/** The credit of the cover photograph, as its licence asks: author, licence and the change. */
function PhotoCredit() {
  const { t } = useMessages();
  return (
    <section className={pageStyles.section} aria-labelledby="credits-photo">
      <h2 id="credits-photo">{t('method.photo.title')}</h2>
      <p className={styles.note}>{t('method.photo.credit')}</p>
      <p className={styles.links}>
        <a href={COVER.page} rel="noreferrer" target="_blank">
          {t('method.photo.page')}
        </a>
        <a href={COVER.licence} rel="noreferrer" target="_blank">
          {t('method.photo.licence')}
        </a>
      </p>
    </section>
  );
}

/** The library's note: each document is its publisher's. */
function LibraryCredit() {
  const { t } = useMessages();
  return (
    <section className={pageStyles.section} aria-labelledby="credits-library">
      <h2 id="credits-library">{t('credits.library.title')}</h2>
      <p className={styles.note}>{t('credits.library.body')}</p>
    </section>
  );
}

/**
 * `/credits`: every official source with the credit its licence asks for, where the listed
 * courses come from, the cover photograph and the library. Credits live here and nowhere else.
 */
export function CreditsPage() {
  const { t } = useMessages();
  const sources = useSources();
  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.intro}>
        <span className={pageStyles.eyebrow}>{t('credits.eyebrow')}</span>
        <h1>{t('credits.title')}</h1>
        <p className={pageStyles.lede}>{t('credits.lede')}</p>
      </header>
      <section className={pageStyles.section} aria-labelledby="credits-data">
        <h2 id="credits-data">{t('credits.data.title')}</h2>
        <QueryState query={sources}>
          {({ sources: list }) => (
            <ul className={styles.sources}>
              {list.map((source) => (
                <SourceEntry key={source.id} source={source} />
              ))}
            </ul>
          )}
        </QueryState>
      </section>
      <CourseCatalogueSources />
      <PhotoCredit />
      <LibraryCredit />
    </div>
  );
}
