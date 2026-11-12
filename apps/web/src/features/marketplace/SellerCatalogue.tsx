import type { MarketCourse, Region, SellerCourse } from '@rewire/contracts';
import type { CellEditRequestEvent } from 'ag-grid-community';
import { useCallback, useMemo, useState } from 'react';

import { useSetTerms } from '../../api/marketplace-queries.ts';
import { useSellerCourses } from '../../api/seller-queries.ts';
import { DEMO_SELLER } from '../../app/seller.ts';
import { Capsule } from '../../components/Capsule.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Business.module.css';
import { typedPrice, useCatalogueColumns } from './business-columns.tsx';
import {
  choicesOf,
  filterCatalogue,
  NO_FILTERS,
  type CatalogueFilters,
} from './business-figures.ts';
import { SellerCourseForm } from './SellerCourseForm.tsx';
import { SellerGrid } from './SellerGrid.tsx';
import { TermsForm } from './TermsForm.tsx';

/**
 * Every course the seller offers in the region, as one table: filters by provider, type,
 * language and status, a search, the price edited in its cell and the full terms of a course
 * opened from its title.
 */
export function SellerCatalogue({
  region,
  courses,
}: {
  readonly region: Region;
  readonly courses: readonly MarketCourse[];
}) {
  const { t } = useMessages();
  const [text, setText] = useState('');
  const [filters, setFilters] = useState<CatalogueFilters>(NO_FILTERS);
  const [editing, setEditing] = useState<MarketCourse | null>(null);
  const { save, onEdit } = usePriceEdit();
  const own = useOwnCourses(region);
  const columns = useCatalogueColumns(setEditing);
  const rows = useMemo(
    () => filterCatalogue(courses, filters, own.ids),
    [courses, filters, own.ids],
  );
  return (
    <div className={styles.view}>
      <div className={styles.viewHead}>
        <p>{t('business.catalogueIntro', { seller: DEMO_SELLER })}</p>
        <span className={styles.count}>
          {t('business.shown', { shown: rows.length, total: courses.length })}
        </span>
      </div>
      <div className={styles.filters}>
        <SearchField text={text} setText={setText} hint={t('business.filterHint')} />
        <ListFilters courses={courses} filters={filters} setFilters={setFilters} />
        <ChoiceFilters filters={filters} setFilters={setFilters} />
      </div>
      {editing && (
        <CourseEditor
          region={region}
          course={editing}
          own={own.byId.get(editing.courseId)}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
      {save.isError && <ErrorNotice error={save.error} />}
      <SellerGrid<MarketCourse>
        label={t('business.catalogue')}
        rows={rows}
        columns={columns}
        quickFilter={text}
        getRowId={({ data }) => data.courseId}
        onEdit={onEdit}
      />
    </div>
  );
}

/** The terms of a course; one published here is edited whole, as it was written. */
function CourseEditor({
  region,
  course,
  own,
  onClose,
}: {
  readonly region: Region;
  readonly course: MarketCourse;
  readonly own: SellerCourse | undefined;
  readonly onClose: () => void;
}) {
  return own ? (
    <SellerCourseForm key={own.id} region={region} course={own} onDone={onClose} />
  ) : (
    <TermsForm key={`${course.courseId}-${course.region}`} course={course} onClose={onClose} />
  );
}

/** A sandbox price typed in its cell, sent as the course's new terms. */
function usePriceEdit() {
  const save = useSetTerms();
  const { mutate } = save;
  const onEdit = useCallback(
    ({ data, newValue }: CellEditRequestEvent<MarketCourse>) => {
      const priceMinor = typedPrice(newValue);
      if (priceMinor === null) return;
      mutate({
        courseId: data.courseId,
        region: data.region,
        priceMinor,
        published: data.published,
      });
    },
    [mutate],
  );
  return { save, onEdit };
}

/** The courses the seller published here, by id. */
function useOwnCourses(region: Region) {
  const query = useSellerCourses(region);
  return useMemo(() => {
    const list: readonly SellerCourse[] = query.data?.courses ?? [];
    return {
      ids: new Set(list.map((course) => course.id)),
      byId: new Map(list.map((course) => [course.id, course])),
    };
  }, [query.data]);
}

/** The search over every column of the table, the hidden ones included. */
export function SearchField({
  text,
  setText,
  hint,
}: {
  readonly text: string;
  readonly setText: (text: string) => void;
  readonly hint?: string;
}) {
  const { t } = useMessages();
  return (
    <label className={`${styles.field} ${styles.search}`}>
      {t('business.filter')}
      <input
        type="search"
        value={text}
        placeholder={hint}
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
    </label>
  );
}

interface FilterProps {
  readonly filters: CatalogueFilters;
  readonly setFilters: (filters: CatalogueFilters) => void;
}

/** The filters with many values, provider and language, as lists. */
function ListFilters({
  courses,
  filters,
  setFilters,
}: FilterProps & { readonly courses: readonly MarketCourse[] }) {
  const { t } = useMessages();
  const providers = useMemo(() => choicesOf(courses, (course) => [course.provider]), [courses]);
  const languages = useMemo(() => choicesOf(courses, (course) => course.languages), [courses]);
  return (
    <>
      <SelectFilter
        label={t('business.provider')}
        value={filters.provider}
        choices={providers.map((provider) => [provider, provider])}
        onChange={(provider) => {
          setFilters({ ...filters, provider });
        }}
      />
      <SelectFilter
        label={t('business.languages')}
        value={filters.language}
        choices={languages.map((code) => [code, code.toUpperCase()])}
        onChange={(language) => {
          setFilters({ ...filters, language });
        }}
      />
    </>
  );
}

function SelectFilter({
  label,
  value,
  choices,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly choices: readonly (readonly [string, string])[];
  readonly onChange: (value: string) => void;
}) {
  const { t } = useMessages();
  return (
    <label className={styles.field}>
      {label}
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        <option value="all">{t('business.filter.all')}</option>
        {choices.map(([choice, name]) => (
          <option key={choice} value={choice}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The filters with few values, type and status, as capsules. */
function ChoiceFilters({ filters, setFilters }: FilterProps) {
  const { t } = useMessages();
  const all = t('business.filter.all');
  return (
    <div className={styles.choices}>
      <Capsule<CatalogueFilters['kind']>
        legend={t('business.kind')}
        value={filters.kind}
        onChange={(kind) => {
          setFilters({ ...filters, kind });
        }}
        options={[
          { value: 'all', label: all },
          { value: 'hosted', label: t('business.kind.hosted') },
          { value: 'listed', label: t('business.kind.listed') },
        ]}
      />
      <Capsule<CatalogueFilters['origin']>
        legend={t('business.filter.origin')}
        value={filters.origin}
        onChange={(origin) => {
          setFilters({ ...filters, origin });
        }}
        options={[
          { value: 'all', label: t('business.origin.all') },
          { value: 'own', label: t('business.origin.own') },
        ]}
      />
      <Capsule<CatalogueFilters['state']>
        legend={t('business.state')}
        value={filters.state}
        onChange={(state) => {
          setFilters({ ...filters, state });
        }}
        options={[
          { value: 'all', label: all },
          { value: 'on-sale', label: t('business.onSale') },
          { value: 'withdrawn', label: t('business.withdrawn') },
        ]}
      />
    </div>
  );
}
