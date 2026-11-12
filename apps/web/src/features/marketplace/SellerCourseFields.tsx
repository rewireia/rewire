import { COURSE_TOPIC_IDS, COURSE_TOPIC_LABELS, REGION_PROFILES } from '@rewire/content';
import type { Region } from '@rewire/contracts';
import { useId, useState, type ReactNode } from 'react';

import { Capsule } from '../../components/Capsule.tsx';
import type { MessageKey } from '../../i18n/en.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Business.module.css';
import {
  EMPTY_DRAFT,
  readDraft,
  visibleErrors,
  type CourseDraft,
  type DraftField,
} from './seller-course-draft.ts';

const ERRORS: Readonly<Record<DraftField, MessageKey>> = {
  title: 'publish.error.title',
  summary: 'publish.error.summary',
  hours: 'publish.error.hours',
  topics: 'publish.error.topics',
  accessUrl: 'publish.error.accessUrl',
  price: 'publish.error.price',
};

/** The draft being typed, and which of its fields already say what is wrong with them. */
export function useDraft(initial: CourseDraft, region: Region, published: boolean) {
  const { t } = useMessages();
  const [draft, setDraft] = useState<CourseDraft>(initial);
  const [shown, setShown] = useState<ReadonlySet<DraftField>>(new Set());
  const errors = visibleErrors(readDraft(draft, region, published).errors, shown);
  return {
    draft,
    change: (patch: Partial<CourseDraft>) => {
      setDraft({ ...draft, ...patch });
    },
    show: (field: DraftField) => {
      setShown(new Set([...shown, field]));
    },
    errorOf: (field: DraftField) => (errors.has(field) ? t(ERRORS[field]) : undefined),
    revealAll: () => {
      setShown(new Set(Object.keys(ERRORS) as DraftField[]));
    },
    reset: () => {
      setDraft(EMPTY_DRAFT);
      setShown(new Set());
    },
  };
}

interface FieldsProps {
  readonly draft: CourseDraft;
  readonly change: (patch: Partial<CourseDraft>) => void;
  readonly show: (field: DraftField) => void;
  readonly errorOf: (field: DraftField) => string | undefined;
}

function Field({
  label,
  hint,
  error,
  children,
  wide = false,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly error: string | undefined;
  readonly children: (ids: { describedBy: string; invalid: boolean }) => ReactNode;
  readonly wide?: boolean;
}) {
  const id = useId();
  return (
    <div className={`${styles.publishField} ${wide ? styles.wide : ''}`}>
      <label className={styles.field}>
        {label}
        {children({ describedBy: `${id}-hint ${id}-error`, invalid: error !== undefined })}
      </label>
      {hint !== undefined && (
        <p id={`${id}-hint`} className={styles.fieldHint}>
          {hint}
        </p>
      )}
      <p id={`${id}-error`} className={styles.fieldError} role="status">
        {error}
      </p>
    </div>
  );
}

export function TextFields({ draft, change, show, errorOf }: FieldsProps) {
  const { t } = useMessages();
  return (
    <>
      <Field label={t('publish.title')} hint={t('publish.titleHint')} error={errorOf('title')} wide>
        {({ describedBy, invalid }) => (
          <input
            data-field="title"
            value={draft.title}
            maxLength={120}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onChange={(event) => {
              change({ title: event.target.value });
            }}
            onBlur={() => {
              show('title');
            }}
          />
        )}
      </Field>
      <Field
        label={t('publish.summary')}
        hint={`${t('publish.summaryHint')} ${t('publish.count', { count: draft.summary.trim().length, max: 600 })}`}
        error={errorOf('summary')}
        wide
      >
        {({ describedBy, invalid }) => (
          <textarea
            data-field="summary"
            value={draft.summary}
            rows={4}
            maxLength={600}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onChange={(event) => {
              change({ summary: event.target.value });
            }}
            onBlur={() => {
              show('summary');
            }}
          />
        )}
      </Field>
    </>
  );
}

export function ChoiceFields({ draft, change, show, errorOf }: FieldsProps) {
  const { t } = useMessages();
  const { language } = useMessages();
  const toggle = (topic: string) => {
    show('topics');
    const chosen = draft.topics.includes(topic)
      ? draft.topics.filter((item) => item !== topic)
      : [...draft.topics, topic].slice(0, 3);
    change({ topics: chosen });
  };
  return (
    <>
      <Capsule<CourseDraft['level']>
        legend={t('publish.level')}
        value={draft.level}
        onChange={(level) => {
          change({ level });
        }}
        options={(['introductory', 'intermediate', 'advanced'] as const).map((level) => ({
          value: level,
          label: t(`publish.level.${level}`),
        }))}
      />
      <Capsule<CourseDraft['language']>
        legend={t('publish.language')}
        value={draft.language}
        onChange={(chosen) => {
          change({ language: chosen });
        }}
        options={[
          { value: 'en', label: 'EN', name: 'English' },
          { value: 'es', label: 'ES', name: 'Español' },
        ]}
      />
      <fieldset className={`${styles.topics} ${styles.wide}`}>
        <legend className={styles.field}>{t('publish.topics')}</legend>
        <div className={styles.topicChips}>
          {COURSE_TOPIC_IDS.map((topic, index) => (
            <label key={topic} className={styles.topicChip}>
              <input
                type="checkbox"
                data-field={index === 0 ? 'topics' : undefined}
                checked={draft.topics.includes(topic)}
                disabled={!draft.topics.includes(topic) && draft.topics.length >= 3}
                onChange={() => {
                  toggle(topic);
                }}
              />
              <span>{COURSE_TOPIC_LABELS[topic][language]}</span>
            </label>
          ))}
        </div>
        <p className={styles.fieldError} role="status">
          {errorOf('topics')}
        </p>
      </fieldset>
    </>
  );
}

function NumberInput(props: {
  readonly field: 'hours' | 'price';
  readonly value: string;
  readonly max: string;
  readonly describedBy: string;
  readonly invalid: boolean;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
}) {
  return (
    <input
      type="number"
      data-field={props.field}
      inputMode="decimal"
      min="0"
      max={props.max}
      step="0.5"
      value={props.value}
      aria-describedby={props.describedBy}
      aria-invalid={props.invalid}
      onChange={(event) => {
        props.onChange(event.target.value);
      }}
      onBlur={props.onBlur}
    />
  );
}

export function AccessFields({
  draft,
  change,
  show,
  errorOf,
  region,
}: FieldsProps & { region: Region }) {
  const { t } = useMessages();
  const currency = REGION_PROFILES[region].currency;
  const number =
    (field: 'hours' | 'price', max: string) =>
    ({ describedBy, invalid }: { describedBy: string; invalid: boolean }) => (
      <NumberInput
        field={field}
        value={draft[field]}
        max={max}
        describedBy={describedBy}
        invalid={invalid}
        onChange={(value) => {
          change({ [field]: value });
        }}
        onBlur={() => {
          show(field);
        }}
      />
    );
  return (
    <>
      <Field label={t('publish.hours')} error={errorOf('hours')}>
        {number('hours', '400')}
      </Field>
      <Field label={t('publish.price', { currency })} error={errorOf('price')}>
        {number('price', '1000')}
      </Field>
      <Field
        label={t('publish.accessUrl')}
        hint={t('publish.accessUrlHint')}
        error={errorOf('accessUrl')}
        wide
      >
        {({ describedBy, invalid }) => (
          <input
            type="url"
            data-field="accessUrl"
            value={draft.accessUrl}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onChange={(event) => {
              change({ accessUrl: event.target.value });
            }}
            onBlur={() => {
              show('accessUrl');
            }}
          />
        )}
      </Field>
    </>
  );
}
