import type { OccupationMatch } from '@rewire/contracts';
import { useId, useState } from 'react';
import { useOccupationSearch } from '../../api/queries.ts';
import { usePreferences } from '../../app/preferences.ts';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { useDebouncedValue } from '../../components/use-debounced-value.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import styles from './Journey.module.css';

export function Results({
  note,
  language,
  matches,
  error,
  onChoose,
  active,
}: {
  readonly note: string | null;
  readonly language: 'en' | 'es';
  readonly active: boolean;
  readonly matches: readonly OccupationMatch[];
  readonly error: unknown;
  readonly onChoose: (match: OccupationMatch) => void;
}) {
  const { t, language: currentLanguage } = useMessages();
  const question = language === currentLanguage ? questionFrom(note) : null;
  return (
    <div className={styles.reply}>
      <h2 lang={question ? language : undefined}>
        {question ??
          t(matches.length > 0 ? 'conversation.results.title' : 'conversation.results.none')}
      </h2>
      {error !== null && <ErrorNotice error={error} />}
      <fieldset disabled={!active} className={styles.replyOptions}>
        <CandidateList matches={matches} onChoose={onChoose} />
        <details>
          <summary>{t('conversation.search.label')}</summary>
          <TitleSearch active={active} onChoose={onChoose} />
        </details>
      </fieldset>
    </div>
  );
}

/** Prefer the interpreter's concrete question; do not display explanatory paragraphs. */
function questionFrom(note: string | null): string | null {
  return note?.match(/¿[^?]*\?|[^.!?¿]*\?/u)?.[0]?.trim() ?? null;
}

function TitleSearch({
  active,
  onChoose,
}: {
  readonly active: boolean;
  readonly onChoose: (match: OccupationMatch) => void;
}) {
  const { t, language } = useMessages();
  const { region } = usePreferences();
  const [title, setTitle] = useState('');
  const [queryLanguage, setQueryLanguage] = useState(language);
  const id = useId();
  const settled = useDebouncedValue(title, 250).trim();
  const search = useOccupationSearch(region, active ? settled : '', queryLanguage);
  return (
    <div className={styles.form}>
      <p className={styles.meta}>{t('conversation.search.hint')}</p>
      <label htmlFor={id}>{t('conversation.search.label')}</label>
      <input
        id={id}
        value={title}
        maxLength={120}
        onChange={(event) => {
          setTitle(event.target.value);
          setQueryLanguage(language);
        }}
      />
      {settled.length >= 2 &&
        settled === title.trim() &&
        search.isSuccess &&
        (search.data.matches.length ? (
          <CandidateList matches={search.data.matches} onChoose={onChoose} />
        ) : (
          <p>{t('conversation.search.empty')}</p>
        ))}
    </div>
  );
}

function CandidateList({
  matches,
  onChoose,
}: {
  readonly matches: readonly OccupationMatch[];
  readonly onChoose: (match: OccupationMatch) => void;
}) {
  return (
    <ul className={styles.results}>
      {matches.map((match) => {
        return (
          <li key={`${match.occupation.code}-${match.unitGroup?.isco08 ?? ''}`}>
            <button
              type="button"
              className={styles.result}
              onClick={() => {
                onChoose(match);
              }}
            >
              <strong>{match.occupation.title}</strong>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
