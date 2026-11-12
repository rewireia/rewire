import { useId, useState } from 'react';

import { useGuideAvailable } from '../../api/guide-queries.ts';
import { Button } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { askGuide } from '../guide/ask-guide.ts';
import styles from '../guide/Guide.module.css';
import { GuidePrivacy } from '../guide/GuidePrivacy.tsx';

const SUGGESTIONS = [
  'timeline.guide.hours',
  'timeline.guide.january',
  'timeline.guide.paid',
] as const;

/**
 * Tempo, the plan agent, on the roadmap: a change said in plain words, or one of a few ready
 * ones, opens its panel with that request; when it changes the plan, the chart follows.
 */
export function GuideSuggestions() {
  const { t } = useMessages();
  const available = useGuideAvailable();
  const id = useId();
  return (
    <section className={styles.tempo} aria-labelledby={`${id}-title`}>
      <div className={styles.tempoHead}>
        <h3 id={`${id}-title`} className={styles.tempoName}>
          {t('guide.title')} <span className={styles.badge}>{t('guide.badge')}</span>
        </h3>
        <p className={styles.small}>{t('timeline.guide.title')}</p>
      </div>
      {available ? (
        <TempoForm id={id} />
      ) : (
        <p className={styles.small}>{t('timeline.guide.off')}</p>
      )}
      <div className={styles.tempoChips} role="group" aria-label={t('timeline.guide.ideas')}>
        {SUGGESTIONS.map((key) => (
          <button
            key={key}
            type="button"
            className={styles.tempoChip}
            aria-haspopup="dialog"
            disabled={!available}
            onClick={() => {
              askGuide(t(key));
            }}
          >
            {t(key)}
          </button>
        ))}
      </div>
    </section>
  );
}

/** What the person writes to Tempo: Enter sends it, Shift+Enter starts a new line. */
function TempoForm({ id }: { readonly id: string }) {
  const { t } = useMessages();
  const [text, setText] = useState('');
  const submit = () => {
    if (text.trim() === '') {
      return;
    }
    askGuide(text.trim());
    setText('');
  };
  return (
    <form
      className={styles.tempoForm}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={`${id}-text`} className="visually-hidden">
        {t('timeline.guide.input')}
      </label>
      <div className={styles.tempoRow}>
        <textarea
          id={`${id}-text`}
          rows={2}
          maxLength={4000}
          placeholder={t('timeline.guide.placeholder')}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <Button primary type="submit" aria-haspopup="dialog" disabled={text.trim() === ''}>
          {t('guide.open')}
        </Button>
      </div>
      <GuidePrivacy className={styles.small} />
    </form>
  );
}
