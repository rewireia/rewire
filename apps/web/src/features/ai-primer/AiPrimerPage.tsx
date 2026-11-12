import { Fragment } from 'react';

import pageStyles from '../../app/Page.module.css';
import { ButtonLink } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './AiPrimer.module.css';
import { inlinesOf, readingMinutes } from './primer-text.ts';
import { DIAGRAM_AFTER, PRIMER_SECTIONS } from './sections.ts';
import { TokenDiagram } from './TokenDiagram.tsx';

/** A paragraph of the guide, with its sources as links. */
function Paragraph({ text }: { readonly text: string }) {
  const { t } = useMessages();
  return (
    <p>
      {inlinesOf(text).map((part, index) =>
        'href' in part ? (
          <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
            {part.text}
            <span className="visually-hidden"> {t('library.newTab')}</span>
          </a>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </p>
  );
}

/** Start, the library and the courses: where the guide sends the reader next. */
function NextSteps() {
  const { t } = useMessages();
  return (
    <div className={styles.next}>
      <ButtonLink primary to="/start">
        {t('nav.start')}
      </ButtonLink>
      <ButtonLink to="/library">{t('nav.library')}</ButtonLink>
      <ButtonLink to="/courses">{t('nav.courses')}</ButtonLink>
    </div>
  );
}

/** `/what-is-ai`: a plain guide to generative AI for an adult who has just read their report. */
export function AiPrimerPage() {
  const { t } = useMessages();
  const minutes = readingMinutes(
    PRIMER_SECTIONS.flatMap((section) => section.paragraphs.map((key) => t(key))),
  );
  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.intro}>
        <span className={pageStyles.eyebrow}>{t('primer.eyebrow')}</span>
        <h1>{t('primer.title')}</h1>
        <p className={pageStyles.lede}>{t('primer.lede')}</p>
        <p className={styles.minutes}>{t('primer.minutes', { minutes })}</p>
      </header>
      <div className={styles.layout}>
        <nav className={styles.contents} aria-labelledby="primer-contents">
          <h2 id="primer-contents" className={styles.contentsTitle}>
            {t('primer.contents')}
          </h2>
          <ol>
            {PRIMER_SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{t(section.title)}</a>
              </li>
            ))}
          </ol>
        </nav>
        <article className={styles.article}>
          {PRIMER_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}>{t(section.title)}</h2>
              {section.paragraphs.map((key) => (
                <Paragraph key={key} text={t(key)} />
              ))}
              {section.id === DIAGRAM_AFTER && <TokenDiagram />}
              {section.id === 'next' && <NextSteps />}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
