import type {
  EmploymentInsights,
  MajorGroupInsight,
  PayInsights,
  TaskBand,
} from '@rewire/contracts';

import type { GaugeBand } from '../../../components/RadialGaugeArc.ts';

/** The bands whose occupations score below 50 out of 100. */
const LOWER_BANDS: ReadonlySet<TaskBand> = new Set(['low', 'very-low']);

/** Share of the employment counted in occupations of low or very low exposure. */
export function lowerShare(employment: EmploymentInsights): number {
  return employment.byBand
    .filter((band) => LOWER_BANDS.has(band.band))
    .reduce((sum, band) => sum + band.share, 0);
}

/** Share of the employment counted in occupations scoring 50 out of 100 or more. */
export function upperShare(employment: EmploymentInsights): number {
  return employment.byBand
    .filter((band) => !LOWER_BANDS.has(band.band))
    .reduce((sum, band) => sum + band.share, 0);
}

/** Whether any occupation counted averages 75 out of 100 or more. */
export function reachesHigh(employment: EmploymentInsights): boolean {
  return employment.byBand.some((band) => band.band === 'high' && band.groups > 0);
}

/** The major group with the highest mean score; the first one in code order on a tie. */
export function mostExposedGroup(groups: readonly MajorGroupInsight[]): MajorGroupInsight | null {
  return groups.reduce<MajorGroupInsight | null>(
    (best, group) => (best === null || group.meanScore > best.meanScore ? group : best),
    null,
  );
}

/** Whether the better-paid half scores higher, lower or the same, in whole points out of 100. */
export function payTrend(pay: PayInsights): 'higher' | 'lower' | 'equal' {
  const above = Math.round(pay.split.above.meanScore * 100);
  const below = Math.round(pay.split.below.meanScore * 100);
  return above > below ? 'higher' : above < below ? 'lower' : 'equal';
}

/** The task band a mean score falls in, by the ILO thresholds: 0.25, 0.50 and 0.75. */
export function bandOfScore(score: number): TaskBand {
  if (score >= 0.75) {
    return 'high';
  }
  if (score >= 0.5) {
    return 'medium';
  }
  return score >= 0.25 ? 'low' : 'very-low';
}

/** The four bands of the ILO on a gauge from 0 to 100, from the least exposed, named. */
export function exposureBands(nameOf: (band: TaskBand) => string): GaugeBand[] {
  const stretches: readonly [TaskBand, number, number][] = [
    ['very-low', 0, 25],
    ['low', 25, 50],
    ['medium', 50, 75],
    ['high', 75, 100],
  ];
  return stretches.map(([band, from, to]) => ({
    from,
    to,
    color: `var(--band-${band})`,
    label: nameOf(band),
  }));
}
