import type { Certificate } from '@rewire/contracts';
import { useParams } from 'react-router';

import { useCertificate } from '../../api/learning-queries.ts';
import { problemCode } from '../../api/request.ts';
import pageStyles from '../../app/Page.module.css';
import { Button } from '../../components/Button.tsx';
import { Mark } from '../../components/Mark.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { formatDate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Certificate.module.css';

/** `/certificates/:id`: a certificate anyone can verify, laid out to print. */
export function CertificatePage() {
  const { t } = useMessages();
  const id = useParams().id ?? '';
  const certificate = useCertificate(id);
  if (problemCode(certificate.error) === 'not_found') {
    return (
      <div className={pageStyles.page}>
        <header className={pageStyles.intro}>
          <h1>{t('certificate.notFound')}</h1>
          <p className={pageStyles.lede}>{t('certificate.notFound.body')}</p>
        </header>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <QueryState query={certificate}>{(data) => <Sheet certificate={data} />}</QueryState>
    </div>
  );
}

function Sheet({ certificate }: { readonly certificate: Certificate }) {
  const { t, language } = useMessages();
  const hours = new Intl.NumberFormat(language).format(certificate.hours);
  return (
    <>
      <div className={styles.tools} data-print="hide">
        <Button
          onClick={() => {
            window.print();
          }}
        >
          {t('certificate.print')}
        </Button>
      </div>
      <article className={styles.sheet} aria-labelledby="certificate-name">
        <header className={styles.brand}>
          <Mark size={20} />
          <span>Rewire</span>
        </header>
        <p className={styles.eyebrow}>{t('certificate.eyebrow')}</p>
        <p className={styles.lead}>{t('certificate.awarded')}</p>
        <h1 id="certificate-name" className={styles.name}>
          {certificate.learnerName}
        </h1>
        <p className={styles.lead}>{t('certificate.completed')}</p>
        <p className={styles.course} lang="en">
          {certificate.courseTitle}
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>{t('certificate.hoursLabel')}</dt>
            <dd>{t('certificate.hours', { hours })}</dd>
          </div>
          <div>
            <dt>{t('certificate.issuedLabel')}</dt>
            <dd>
              <time dateTime={certificate.issuedOn}>
                {formatDate(certificate.issuedOn, language)}
              </time>
            </dd>
          </div>
          <div>
            <dt>{t('certificate.code')}</dt>
            <dd className="mono">{certificate.id}</dd>
          </div>
        </dl>
        <footer className={styles.footer}>
          <p>{t('certificate.verify')}</p>
          <p className="mono">{window.location.href}</p>
          <p className={styles.demo}>{t('certificate.demo')}</p>
        </footer>
      </article>
    </>
  );
}
