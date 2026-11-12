import type { Currency, MarketCourse, MarketSale, MarketSalesTotal } from '@rewire/contracts';

/** What one day sold in one currency, in minor units: kept, and given back. */
interface SalesDay {
  readonly day: string;
  readonly keptMinor: number;
  readonly refundedMinor: number;
}

/** A course among the best sellers: how many paid sales it has. */
interface BestSeller {
  readonly courseId: string;
  readonly title: string;
  readonly provider: string | null;
  readonly sold: number;
}

/** The catalogue filters: a value of each, or `all`. */
export interface CatalogueFilters {
  readonly provider: string;
  readonly kind: 'all' | MarketCourse['kind'];
  readonly language: string;
  readonly state: 'all' | 'on-sale' | 'withdrawn';
  /** Every course, or only those the seller published here. */
  readonly origin: 'all' | 'own';
}

export const NO_FILTERS: CatalogueFilters = {
  provider: 'all',
  kind: 'all',
  language: 'all',
  state: 'all',
  origin: 'all',
};

/**
 * The totals shown first: those of the region's currency, then the others. A seller who sold
 * nothing has none.
 */
export function totalsInOrder(
  totals: readonly MarketSalesTotal[],
  currency: Currency,
): MarketSalesTotal[] {
  return totals.toSorted(
    (first, second) => Number(second.currency === currency) - Number(first.currency === currency),
  );
}

/**
 * The sales of one currency by day of sale, oldest first. A paid sale counts what it kept; a
 * sale in review counts nothing yet; what went back counts as refunded.
 */
export function salesByDay(sales: readonly MarketSale[], currency: Currency): SalesDay[] {
  const days = new Map<string, { keptMinor: number; refundedMinor: number }>();
  for (const sale of sales) {
    if (sale.amount.currency !== currency) continue;
    const day = sale.createdAt.slice(0, 10);
    const entry = days.get(day) ?? { keptMinor: 0, refundedMinor: 0 };
    if (sale.status === 'completed') entry.keptMinor += sale.amount.minorUnits - sale.refundedMinor;
    entry.refundedMinor += sale.refundedMinor;
    days.set(day, entry);
  }
  return [...days.entries()]
    .toSorted(([first], [second]) => first.localeCompare(second))
    .map(([day, entry]) => ({ day, ...entry }));
}

/** The courses with most paid sales, most first, then by title. */
export function bestSellers(sales: readonly MarketSale[], limit = 5): BestSeller[] {
  const counts = new Map<string, BestSeller>();
  for (const sale of sales) {
    if (sale.status !== 'completed') continue;
    const known = counts.get(sale.courseId);
    counts.set(sale.courseId, {
      courseId: sale.courseId,
      title: sale.title,
      provider: sale.provider,
      sold: (known?.sold ?? 0) + 1,
    });
  }
  return [...counts.values()]
    .toSorted(
      (first, second) => second.sold - first.sold || first.title.localeCompare(second.title),
    )
    .slice(0, limit);
}

/** The distinct values of a field of the catalogue, sorted, for a filter. */
export function choicesOf(
  courses: readonly MarketCourse[],
  valuesOf: (course: MarketCourse) => readonly string[],
): string[] {
  return [...new Set(courses.flatMap(valuesOf))].toSorted((first, second) =>
    first.localeCompare(second),
  );
}

/** The courses that match every filter. */
export function filterCatalogue(
  courses: readonly MarketCourse[],
  filters: CatalogueFilters,
  own: ReadonlySet<string> = new Set(),
): MarketCourse[] {
  return courses.filter(
    (course) =>
      (filters.origin === 'all' || own.has(course.courseId)) &&
      (filters.provider === 'all' || course.provider === filters.provider) &&
      (filters.kind === 'all' || course.kind === filters.kind) &&
      (filters.language === 'all' || course.languages.includes(filters.language)) &&
      (filters.state === 'all' || course.published === (filters.state === 'on-sale')),
  );
}
