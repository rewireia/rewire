import type { RoadmapCourse, TaskBand, Wallet } from '@rewire/contracts';

import type { GaugeBand } from '../../components/RadialGaugeArc.ts';

/**
 * The four bands of the ILO index in points from 0 to 100: very low below 25, low from 25,
 * medium from 50 and high from 75, as its data dictionary defines them.
 */
export function exposureBands(names: Readonly<Record<TaskBand, string>>): readonly GaugeBand[] {
  return [
    { from: 0, to: 25, color: 'var(--band-very-low)', label: names['very-low'] },
    { from: 25, to: 50, color: 'var(--band-low)', label: names.low },
    { from: 50, to: 75, color: 'var(--band-medium)', label: names.medium },
    { from: 75, to: 100, color: 'var(--band-high)', label: names.high },
  ];
}

/** Progress through the plan in percent: from starting out to nearly there. */
export function planBands(names: readonly [string, string, string]): readonly GaugeBand[] {
  return [
    { from: 0, to: 34, color: 'var(--band-medium)', label: names[0] },
    { from: 34, to: 67, color: 'var(--band-low)', label: names[1] },
    { from: 67, to: 100, color: 'var(--band-very-low)', label: names[2] },
  ];
}

/** Share of the money added that is spent, in percent: plenty left, running low, nearly spent. */
export function walletBands(names: readonly [string, string, string]): readonly GaugeBand[] {
  return [
    { from: 0, to: 60, color: 'var(--band-very-low)', label: names[0] },
    { from: 60, to: 85, color: 'var(--band-low)', label: names[1] },
    { from: 85, to: 100, color: 'var(--band-medium)', label: names[2] },
  ];
}

/** Courses of the plan finished, out of those still in it; `null` when the plan is empty. */
export function planProgress(
  courses: readonly RoadmapCourse[],
): { readonly completed: number; readonly total: number; readonly percent: number } | null {
  const counted = courses.filter((course) => course.status !== 'revoked');
  if (counted.length === 0) {
    return null;
  }
  const completed = counted.filter((course) => course.status === 'completed').length;
  return {
    completed,
    total: counted.length,
    percent: Math.round((completed / counted.length) * 100),
  };
}

/** Money paid from the wallet, out of all the money added; `null` before the first top-up. */
export function walletUse(wallet: Wallet): number | null {
  if (wallet.fundedMinor <= 0) {
    return null;
  }
  return Math.min(100, Math.round((wallet.spentMinor / wallet.fundedMinor) * 100));
}
