import { describe, expect, it } from 'vitest';

import { exposureProfileOf, personalExposureOf, type TimeShare } from '../src/index.ts';

import { dataset, scoredOccupation, task } from './support/builders.ts';

/** One task in each band: high, medium, low and very low. */
const CLERKS = {
  ...scoredOccupation('4313', 'Payroll clerks', [], 0.45),
  tasks: [
    task('4313-1', 0.8, { modelScores: { gpt4o: 0.7, gemini: 0.9 } }),
    task('4313-2', 0.6, { modelScores: { gpt4o: 0.5, gemini: 0.65 } }),
    task('4313-3', 0.3, { modelScores: { gpt4o: 0.3, gemini: 0.2 } }),
    task('4313-4', 0.1, { modelScores: { gpt4o: null, gemini: 0.3 } }),
  ],
};
const PROFILE = exposureProfileOf(dataset([CLERKS]), '4313') ?? missing('4313');
const TIME_SHARES: readonly TimeShare[] = ['most', 'some', 'little', 'none'];

function missing(isco08: string): never {
  throw new Error(`${isco08} has no profile`);
}

function answers(...shares: TimeShare[]): Map<string, TimeShare> {
  return new Map(shares.map((share, position) => [`4313-${position + 1}`, share]));
}

describe('personalExposureOf', () => {
  it('without answers, gives the plain mean of the task scores', () => {
    const exposure = personalExposureOf(PROFILE);

    expect(exposure.score).toBeCloseTo((0.8 + 0.6 + 0.3 + 0.1) / 4);
    expect(exposure.tasksCounted).toBe(4);
    expect(exposure.weekByBand).toEqual({ high: 25, medium: 25, low: 25, 'very-low': 25 });
  });

  it('weighs a task 3, 2, 1 or 0 for most, some, little or none of the week', () => {
    const exposure = personalExposureOf(PROFILE, answers('most', 'some', 'little', 'none'));

    expect(exposure.score).toBeCloseTo((3 * 0.8 + 2 * 0.6 + 1 * 0.3) / 6);
    expect(exposure.tasksCounted).toBe(3);
    expect(exposure.weekByBand).toEqual({ high: 50, medium: 35, low: 15, 'very-low': 0 });
  });

  it('counts a task without an answer as some of the week', () => {
    const partly = personalExposureOf(PROFILE, new Map([['4313-1', 'most']]));
    const explicit = personalExposureOf(PROFILE, answers('most', 'some', 'some', 'some'));

    expect(partly).toEqual(explicit);
  });

  it('gives no score and no range when no task takes any time', () => {
    expect(personalExposureOf(PROFILE, answers('none', 'none', 'none', 'none'))).toEqual({
      score: null,
      range: null,
      weekByBand: { high: 0, medium: 0, low: 0, 'very-low': 0 },
      tasksCounted: 0,
    });
  });

  it('keeps the score inside its range and the week at 100 points, for every answer', () => {
    for (const first of TIME_SHARES) {
      for (const second of TIME_SHARES) {
        for (const third of TIME_SHARES) {
          for (const fourth of TIME_SHARES) {
            const exposure = personalExposureOf(PROFILE, answers(first, second, third, fourth));
            if (exposure.score === null || exposure.range === null) {
              expect(exposure.tasksCounted).toBe(0);
              continue;
            }
            expect(exposure.range.low).toBeLessThanOrEqual(exposure.score);
            expect(exposure.range.high).toBeGreaterThanOrEqual(exposure.score);
            const week = Object.values(exposure.weekByBand);
            expect(week.reduce((sum, points) => sum + points, 0)).toBe(100);
          }
        }
      }
    }
  });
});
