import type { MarketCourse } from '@rewire/contracts';
import { useEffect, useRef, useState } from 'react';

import { useSetTerms } from '../../api/marketplace-queries.ts';
import { DEMO_SELLER } from '../../app/seller.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Business.module.css';
import { typedPrice } from './business-columns.tsx';

/**
 * The terms of one course: its one sandbox price and whether it is on sale. The server keeps
 * them and answers with the course.
 */
export function TermsForm({
  course,
  onClose,
}: {
  readonly course: MarketCourse;
  readonly onClose: () => void;
}) {
  const { t } = useMessages();
  const save = useSetTerms();
  const form = useRef<HTMLFormElement>(null);
  const [price, setPrice] = useState(
    String((course.offer?.listPrice.minorUnits ?? course.priceMinor) / 100),
  );
  const [published, setPublished] = useState(course.published);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    form.current?.scrollIntoView({ block: 'nearest' });
  }, []);
  return (
    <form
      ref={form}
      className={styles.terms}
      onSubmit={(event) => {
        event.preventDefault();
        const priceMinor = typedPrice(price);
        setInvalid(priceMinor === null);
        if (priceMinor === null) return;
        save.mutate(
          { courseId: course.courseId, region: course.region, priceMinor, published },
          { onSuccess: onClose },
        );
      }}
    >
      <div className={styles.termsHead}>
        <h3>{course.title}</h3>
        <p>{t('business.termsBy', { provider: course.provider, seller: DEMO_SELLER })}</p>
      </div>
      <TermsFields
        course={course}
        price={price}
        setPrice={setPrice}
        published={published}
        setPublished={setPublished}
      />
      <div className={styles.termsActions}>
        <Button primary type="submit" disabled={save.isPending}>
          {t('business.save')}
        </Button>
        <Button onClick={onClose}>{t('business.cancel')}</Button>
      </div>
      {invalid && <p role="alert">{t('business.invalid')}</p>}
      {save.isError && <ErrorNotice error={save.error} />}
    </form>
  );
}

/** The price, in the course's currency, and whether the course is on sale. */
function TermsFields({
  course,
  price,
  setPrice,
  published,
  setPublished,
}: {
  readonly course: MarketCourse;
  readonly price: string;
  readonly setPrice: (price: string) => void;
  readonly published: boolean;
  readonly setPublished: (published: boolean) => void;
}) {
  const { t } = useMessages();
  return (
    <div className={styles.termsFields}>
      <label className={styles.field}>
        {`${t('business.price')} (${course.currency})`}
        <input
          type="number"
          min="1"
          max="1000"
          step="0.01"
          required
          value={price}
          onChange={(event) => {
            setPrice(event.target.value);
          }}
        />
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={published}
          onChange={(event) => {
            setPublished(event.target.checked);
          }}
        />
        {t('business.publishedField')}
      </label>
    </div>
  );
}
