import { readingScopeSchema, type Reading } from '@rewire/contracts';
import type { ReactNode } from 'react';

import { Capsule } from '../../components/Capsule.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { choicesOf, toggleScope, type LibraryFilters as Filters } from './filters.ts';
import styles from './Library.module.css';

const KINDS = ['all', 'note', 'guide', 'report'] as const;

interface LibraryFiltersProps {
  readonly readings: readonly Reading[];
  readonly filters: Filters;
  readonly onChange: (change: Partial<Filters>) => void;
}

/** The kind as a capsule; topic and level as quiet lists; where it applies as pills to toggle. */
export function LibraryFilters({ readings, filters, onChange }: LibraryFiltersProps) {
  const { t } = useMessages();
  const { topics, levels } = choicesOf(readings);
  return (
    <div className={styles.filters}>
      <Capsule
        legend={t('library.kind')}
        hideLegend
        options={KINDS.map((kind) => ({ value: kind, label: t(`library.kind.${kind}`) }))}
        value={filters.type}
        onChange={(type) => {
          onChange({ type });
        }}
      />
      <div className={styles.pills} role="group" aria-label={t('library.filters')}>
        <Choice
          label={t('library.filter.topic')}
          value={filters.topic}
          onChange={(value) => {
            onChange({ topic: topics.find((topic) => topic === value) ?? 'all' });
          }}
        >
          <option value="all">{`${t('library.filter.topic')}: ${t('library.filter.any')}`}</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {t(`library.topic.${topic}`)}
            </option>
          ))}
        </Choice>
        <Choice
          label={t('library.filter.level')}
          value={filters.level}
          onChange={(value) => {
            onChange({ level: levels.find((level) => level === value) ?? 'all' });
          }}
        >
          <option value="all">{`${t('library.filter.level')}: ${t('library.filter.any')}`}</option>
          {levels.map((level) => (
            <option key={level} value={level}>
              {t(`library.level.${level}`)}
            </option>
          ))}
        </Choice>
        <ScopePills scopes={filters.scopes} onChange={onChange} />
      </div>
    </div>
  );
}

/** Where a reading applies, as pills that each turn on or off. */
function ScopePills({
  scopes,
  onChange,
}: {
  readonly scopes: Filters['scopes'];
  readonly onChange: (change: Partial<Filters>) => void;
}) {
  const { t } = useMessages();
  return (
    <div className={styles.scopes} role="group" aria-label={t('library.filter.scope')}>
      {readingScopeSchema.options.map((scope) => (
        <button
          key={scope}
          type="button"
          className={styles.scope}
          aria-pressed={scopes.includes(scope)}
          aria-label={scope === 'global' ? undefined : t(`region.${scope}`)}
          onClick={() => {
            onChange({ scopes: toggleScope(scopes, scope) });
          }}
        >
          <span className={styles.tick} aria-hidden="true" />
          {t(`library.scope.${scope}`)}
        </button>
      ))}
    </div>
  );
}

/** A filter as a fine pill holding a native list; `all` means any. */
function Choice({
  label,
  value,
  onChange,
  children,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly children: ReactNode;
}) {
  return (
    <label className={styles.choice} data-set={value !== 'all'}>
      <span className="visually-hidden">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {children}
      </select>
    </label>
  );
}
