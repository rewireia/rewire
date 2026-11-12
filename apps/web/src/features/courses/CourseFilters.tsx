import { courseLevelSchema, type CourseCatalogue } from '@rewire/contracts';

import { Capsule } from '../../components/Capsule.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { isFiltered, NO_FILTER, type CourseFilter, type DurationRange } from './course-filter.ts';
import styles from './Courses.module.css';

const DURATIONS: readonly DurationRange[] = ['short', 'medium', 'long'];

interface FiltersProps {
  readonly catalogue: CourseCatalogue;
  readonly filter: CourseFilter;
  readonly onChange: (change: Partial<CourseFilter>) => void;
}

/** The search field and the pills that narrow the catalogue. */
export function Filters({
  catalogue,
  languages,
  filter,
  offered,
  onChange,
}: FiltersProps & { readonly languages: readonly ('en' | 'es')[]; readonly offered: boolean }) {
  const { t } = useMessages();
  return (
    <div className={styles.filters}>
      <SearchField
        value={filter.text}
        onChange={(text) => {
          onChange({ text });
        }}
      />
      <div className={styles.pills} role="group" aria-label={t('courses.filter.label')}>
        {offered && (
          <Toggle
            tone="offer"
            label={t('offers.filter')}
            pressed={filter.onOffer}
            onChange={(onOffer) => {
              onChange({ onOffer });
            }}
          />
        )}
        {languages.length > 1 && (
          <LanguageFilter
            languages={languages}
            value={filter.language}
            onChange={(language) => {
              onChange({ language });
            }}
          />
        )}
        <ListFilters catalogue={catalogue} filter={filter} onChange={onChange} />
        {isFiltered(filter) && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              onChange({ ...NO_FILTER, language: filter.language });
            }}
          >
            {t('courses.filter.clear')}
          </button>
        )}
      </div>
    </div>
  );
}

/** All the courses, or those offered in one of the languages of the interface. */
function LanguageFilter({
  languages,
  value,
  onChange,
}: {
  readonly languages: readonly ('en' | 'es')[];
  readonly value: string | null;
  readonly onChange: (language: string | null) => void;
}) {
  const { t } = useMessages();
  const options = [
    { value: 'all', label: t('courses.filter.language.all') },
    ...languages.map((language) => ({
      value: language,
      label: t(`courses.filter.language.${language}`),
    })),
  ];
  return (
    <Capsule
      legend={t('courses.filter.language')}
      hideLegend
      options={options}
      value={value ?? 'all'}
      onChange={(chosen) => {
        onChange(chosen === 'all' ? null : chosen);
      }}
    />
  );
}

/** Subject, level, provider and duration, each a list whose first option is "any". */
function ListFilters({ catalogue, filter, onChange }: FiltersProps) {
  const { t } = useMessages();
  return (
    <>
      <Choice
        label={t('courses.filter.topic')}
        any={t('courses.filter.topic.any')}
        options={catalogue.topics.map(({ id, label }) => ({ value: id, label }))}
        value={filter.topic}
        onChange={(topic) => {
          onChange({ topic });
        }}
      />
      <Choice
        label={t('courses.filter.level')}
        any={t('courses.filter.level.any')}
        options={courseLevelSchema.options.map((level) => ({
          value: level,
          label: t(`courses.level.${level}`),
        }))}
        value={filter.level}
        onChange={(value) => {
          onChange({ level: courseLevelSchema.nullable().catch(null).parse(value) });
        }}
      />
      <Choice
        label={t('courses.filter.provider')}
        any={t('courses.filter.provider.any')}
        options={catalogue.providers.map((provider) => ({ value: provider, label: provider }))}
        value={filter.provider}
        onChange={(provider) => {
          onChange({ provider });
        }}
      />
      <Choice
        label={t('courses.filter.duration')}
        any={t('courses.filter.duration.any')}
        options={DURATIONS.map((range) => ({
          value: range,
          label: t(`courses.filter.duration.${range}`),
        }))}
        value={filter.duration}
        onChange={(value) => {
          onChange({ duration: DURATIONS.find((range) => range === value) ?? null });
        }}
      />
    </>
  );
}

/** The words to look for, matched as they are typed. */
function SearchField({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (text: string) => void;
}) {
  const { t } = useMessages();
  return (
    <label className={styles.search}>
      <span className="visually-hidden">{t('courses.search.label')}</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
      <input
        type="search"
        value={value}
        placeholder={t('courses.search.placeholder')}
        maxLength={120}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </label>
  );
}

/** A condition switched on and off, as a pill; the offer's own pill carries its colour. */
function Toggle({
  label,
  pressed,
  tone = 'plain',
  onChange,
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly tone?: 'plain' | 'offer';
  readonly onChange: (pressed: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={styles.toggle}
      data-tone={tone}
      aria-pressed={pressed}
      onClick={() => {
        onChange(!pressed);
      }}
    >
      <span className={styles.tick} aria-hidden="true" />
      {label}
    </button>
  );
}

interface ChoiceProps {
  readonly label: string;
  /** The first option, which means "any". */
  readonly any: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
}

/** A filter as a quiet pill holding a native list: the empty value means "any". */
function Choice({ label, any, options, value, onChange }: ChoiceProps) {
  return (
    <label className={styles.choice} data-set={value !== null}>
      <span className="visually-hidden">{label}</span>
      <select
        value={value ?? ''}
        onChange={(event) => {
          onChange(event.target.value === '' ? null : event.target.value);
        }}
      >
        <option value="">{any}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
