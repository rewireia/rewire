import { useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { useClaimCertificate } from '../../api/learning-queries.ts';
import { useSession } from '../../api/queries.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { certificateDestination } from './certificate-destination.ts';

import styles from './Learn.module.css';

/** The learner writes the name to print, the only personal detail a certificate carries. */
export function ClaimCertificate({ courseId }: { readonly courseId: string }) {
  const { t } = useMessages();
  const id = useId();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const session = useSession();
  const [name, setName] = useState<string | null>(null);
  const claim = useClaimCertificate(courseId, (certificate) => {
    const destination = certificateDestination(certificate.id, pathname, window.location.pathname);
    if (destination !== null) {
      void navigate(destination);
    }
  });
  const value = name ?? session.data?.certificateName ?? '';
  return (
    <form
      className={styles.claim}
      aria-labelledby={`${id}-title`}
      onSubmit={(event) => {
        event.preventDefault();
        claim.mutate({ learnerName: value.trim() });
      }}
    >
      <h3 id={`${id}-title`}>{t('learn.claim.title')}</h3>
      <p className={styles.small}>{t('learn.claim.lede')}</p>
      <label className={styles.field}>
        <span>{t('learn.claim.name')}</span>
        <input
          type="text"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          value={value}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </label>
      <div>
        <Button type="submit" primary disabled={claim.isPending}>
          {t('learn.claim.submit')}
        </Button>
      </div>
      {claim.isError && <ErrorNotice error={claim.error} />}
    </form>
  );
}
