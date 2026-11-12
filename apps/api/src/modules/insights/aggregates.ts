import type {
  EmploymentInsights,
  InsightSource,
  MajorGroupInsight,
  PayInsights,
  RegionInsights,
  TaskBand,
} from '@rewire/contracts';
import type {
  EmploymentSeries,
  ExposureDataset,
  ExposureGradient,
  PaySeries,
  ScoredOccupation,
} from '@rewire/data';
import { TASK_BANDS, taskBandOf } from '@rewire/engine';

import type { SeriesItem } from './series.ts';

/** The ILO's categories, from the most to the least exposed. */
const GRADIENTS: readonly ExposureGradient[] = [
  'gradient-4',
  'gradient-3',
  'gradient-2',
  'gradient-1',
  'minimal',
  'not-exposed',
];

const EXTREMES = 5;

const mean = (values: readonly number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const lineOf = ({ isco08, title, meanScore, gradient }: ScoredOccupation) => ({
  isco08,
  title,
  meanScore,
  gradient,
});

/** What the ILO index says on its own: categories, bands and the extremes. */
export function indexInsights(
  exposure: ExposureDataset,
  source: InsightSource,
): RegionInsights['index'] {
  const occupations = exposure.occupations;
  const ranked = occupations.toSorted(
    (a, b) => b.meanScore - a.meanScore || a.isco08.localeCompare(b.isco08),
  );
  return {
    source,
    unitGroups: occupations.length,
    byGradient: GRADIENTS.map((gradient) => ({
      gradient,
      unitGroups: occupations.filter((occupation) => occupation.gradient === gradient).length,
    })),
    byBand: TASK_BANDS.map((band) => ({
      band,
      unitGroups: occupations.filter((occupation) => taskBandOf(occupation.meanScore) === band)
        .length,
    })),
    mostExposed: ranked.slice(0, EXTREMES).map(lineOf),
    leastExposed: ranked.slice(-EXTREMES).reverse().map(lineOf),
  };
}

/** Each major group's mean score and, when the series tells it apart, how many work in it. */
export function majorGroupInsights(
  exposure: ExposureDataset,
  employment: readonly SeriesItem[] | null,
): MajorGroupInsight[] {
  const total = employment?.reduce((sum, item) => sum + item.value, 0) ?? 0;
  return exposure.majorGroups.map(({ code, title }) => {
    const scores = exposure.occupations
      .filter((occupation) => occupation.majorGroup === code)
      .map((occupation) => occupation.meanScore);
    const employed =
      employment === null
        ? null
        : employment
            .filter((item) => item.majorGroup === code)
            .reduce((sum, item) => sum + item.value, 0);
    return {
      code,
      title,
      meanScore: mean(scores),
      unitGroups: scores.length,
      employed,
      employedShare: employed === null || total === 0 ? null : employed / total,
    };
  });
}

/** How many work in occupations of each band, and the exposure of the average worker. */
export function employmentInsights(
  series: EmploymentSeries,
  items: readonly SeriesItem[],
  source: InsightSource,
): EmploymentInsights | null {
  const matched = items.reduce((sum, item) => sum + item.value, 0);
  if (matched === 0) {
    return null;
  }
  const weighted = items.reduce((sum, item) => sum + item.value * item.meanScore, 0);
  return {
    source,
    level: series.level,
    counts: series.counts,
    period: series.period,
    population: series.population,
    total: Object.values(series.byCode).reduce((sum, value) => sum + value, 0),
    matched,
    meanScore: weighted / matched,
    byBand: TASK_BANDS.map((band) => bandShare(band, items, matched)),
  };
}

function bandShare(band: TaskBand, items: readonly SeriesItem[], matched: number) {
  const inBand = items.filter((item) => taskBandOf(item.meanScore) === band);
  const employed = inBand.reduce((sum, item) => sum + item.value, 0);
  return { band, employed, share: employed / matched, groups: inBand.length };
}

/** Pay against exposure, and the mean score of the better and the worse paid half. */
export function payInsights(
  series: PaySeries,
  items: readonly SeriesItem[],
  source: InsightSource,
): PayInsights | null {
  if (items.length < 2) {
    return null;
  }
  const points = items
    .map(({ code, title, value, meanScore }) => ({ code, title, pay: value, meanScore }))
    .toSorted((a, b) => a.pay - b.pay || a.code.localeCompare(b.code));
  const medianPay = medianOf(points.map((point) => point.pay));
  const above = points.filter((point) => point.pay > medianPay);
  const below = points.filter((point) => point.pay <= medianPay);
  return {
    source,
    level: series.level,
    currency: series.currency,
    measure: series.measure,
    period: series.period,
    population: series.population,
    points,
    split: {
      medianPay,
      above: { groups: above.length, meanScore: mean(above.map((point) => point.meanScore)) },
      below: { groups: below.length, meanScore: mean(below.map((point) => point.meanScore)) },
    },
  };
}

/** The median of values sorted from low to high. */
function medianOf(sorted: readonly number[]): number {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
