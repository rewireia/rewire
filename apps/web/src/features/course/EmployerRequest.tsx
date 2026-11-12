import type { CourseCard, Region, Sponsorship } from '@rewire/contracts';
import { useId, useState } from 'react';

import { useRequestSponsorship } from '../../api/commerce-queries.ts';
import { useRegions } from '../../api/queries.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { GuidePrivacy } from '../guide/GuidePrivacy.tsx';

import styles from './Course.module.css';

/** The region's case for an employer paying: its headline, the literal rule and its source. */
function EmployerCase({ region }: { readonly region: Region }) {
  const regions = useRegions();
  const summary = regions.data?.regions.find((entry) => entry.region === region);
  if (summary === undefined) {
    return null;
  }
  const { headline, quote, explanation, source } = summary.employerCase;
  return (
    <div className={styles.case} lang="en">
      <p className={styles.headline}>{headline}</p>
      <blockquote className={styles.quote} cite={source.url}>
        <p>“{quote}”</p>
        <footer>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.title}
          </a>
        </footer>
      </blockquote>
      <p className={styles.small}>{explanation}</p>
    </div>
  );
}

/** "Ask my employer to pay": a PayPal invoice the employer pays; the course opens then. */
export function EmployerRequest({
  region,
  course,
}: {
  readonly region: Region;
  readonly course: CourseCard;
}) {
  const { t } = useMessages();
  const id = useId();
  const request = useRequestSponsorship();
  return (
    <section className={styles.way} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{t('sponsor.title')}</h2>
      <p className={styles.small}>{t('sponsor.lede')}</p>
      <EmployerCase region={region} />
      {request.isSuccess ? (
        <SponsorshipSent sponsorship={request.data} />
      ) : (
        <EmployerForm
          pending={request.isPending}
          error={request.isError ? request.error : null}
          onSend={(employerEmail, employerName) => {
            request.mutate({
              courseId: course.id,
              region,
              employerEmail,
              ...(employerName === '' ? {} : { employerName }),
            });
          }}
        />
      )}
    </section>
  );
}

interface EmployerFormProps {
  readonly pending: boolean;
  readonly error: unknown;
  readonly onSend: (email: string, name: string) => void;
}

function EmployerForm({ pending, error, onSend }: EmployerFormProps) {
  const { t } = useMessages();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onSend(email.trim(), name.trim());
      }}
    >
      <label className={styles.field}>
        <span>{t('sponsor.email')}</span>
        <input
          type="email"
          required
          maxLength={254}
          autoComplete="off"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
      </label>
      <label className={styles.field}>
        <span>{t('sponsor.name')}</span>
        <input
          type="text"
          maxLength={120}
          autoComplete="organization"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </label>
      <GuidePrivacy className={styles.small} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t('sponsor.sending') : t('sponsor.submit')}
        </Button>
      </div>
      {error !== null && <ErrorNotice error={error} />}
    </form>
  );
}

function SponsorshipSent({ sponsorship }: { readonly sponsorship: Sponsorship }) {
  const { t } = useMessages();
  return (
    <div className={styles.notice} role="status">
      <p>{t('sponsor.sent', { number: sponsorship.invoiceNumber })}</p>
      <p>
        {t('sponsor.statusLabel')}: {t(`sponsor.status.${sponsorship.status}`)}
      </p>
      {sponsorship.payUrl !== null && (
        <a href={sponsorship.payUrl} target="_blank" rel="noreferrer">
          {t('sponsor.pay')}
        </a>
      )}
    </div>
  );
}
