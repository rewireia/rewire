import { describe, expect, it } from 'vitest';

import { exposureProfileOf } from '../src/index.ts';

import { dataset, scoredOccupation, task } from './support/builders.ts';

const DEVELOPERS = {
  ...scoredOccupation('2512', 'Software developers', [], 0.53),
  tasks: [
    task('2512-10', 0.6),
    task('2512-2', 0.5, { modelScores: { gpt4o: 0.63, gemini: 0.65 }, origin: 'reconciled' }),
    task('2512-1', 0.605, { modelScores: { gpt4o: 0.56, gemini: 0.65 } }),
    task('2512-3', 0.6, { modelScores: { gpt4o: null, gemini: 0.4 } }),
    task('2512-4', 0.2),
  ],
};
const CLERKS = scoredOccupation('4313', 'Payroll clerks', [0.8, 0.7]);
const DATASET = dataset([DEVELOPERS, CLERKS]);

function profileOf(isco08: string) {
  const profile = exposureProfileOf(DATASET, isco08);
  if (profile === undefined) {
    throw new Error(`no profile for ${isco08}`);
  }
  return profile;
}

describe('exposureProfileOf', () => {
  it('returns nothing for a unit group the ILO has not scored', () => {
    expect(exposureProfileOf(DATASET, '0110')).toBeUndefined();
  });

  it('copies the figures of the unit group and names its major group', () => {
    expect(profileOf('2512')).toMatchObject({
      isco08: '2512',
      title: 'Software developers',
      majorGroup: { code: '2', title: 'Professionals' },
      meanScore: 0.53,
      gradient: 'gradient-2',
    });
  });

  it('orders the tasks from the most exposed, ties by task number', () => {
    expect(profileOf('2512').tasks.map((profiled) => profiled.id)).toEqual([
      '2512-1',
      '2512-3',
      '2512-10',
      '2512-2',
      '2512-4',
    ]);
  });

  it('orders tasks of equal score by their number, not as text', () => {
    const tied = { ...DEVELOPERS, tasks: [task('2512-10', 0.5), task('2512-2', 0.5)] };
    const profile = exposureProfileOf(dataset([tied]), '2512');

    expect(profile?.tasks.map((profiled) => profiled.id)).toEqual(['2512-2', '2512-10']);
  });

  it('spans each task range across the two predictions and the published score', () => {
    const ranges = Object.fromEntries(
      profileOf('2512').tasks.map((profiled) => [profiled.id, profiled.range]),
    );

    expect(ranges['2512-2']).toEqual({ low: 0.5, high: 0.65 });
    expect(ranges['2512-1']).toEqual({ low: 0.56, high: 0.65 });
    expect(ranges['2512-3']).toEqual({ low: 0.4, high: 0.6 });
  });

  it('marks the scores the authors set after expert review', () => {
    const reviewed = profileOf('2512').tasks.filter((profiled) => profiled.reviewedByExperts);

    expect(reviewed.map((profiled) => profiled.id)).toEqual(['2512-2']);
  });

  it('places each task in its band and counts the tasks of every band', () => {
    const profile = profileOf('2512');

    expect(profile.tasks.map((profiled) => profiled.band)).toEqual([
      'medium',
      'medium',
      'medium',
      'medium',
      'very-low',
    ]);
    expect(profile.tasksByBand).toEqual({ high: 0, medium: 4, low: 0, 'very-low': 1 });
  });

  it('ranks the unit group among every scored one', () => {
    expect(profileOf('2512').standing).toMatchObject({ moreExposed: 1, outOf: 2 });
  });

  it('refuses a dataset that does not name the major group of a unit group', () => {
    const unnamed = { ...DATASET, majorGroups: [] };

    expect(() => exposureProfileOf(unnamed, '4313')).toThrow(/major group 4/);
  });
});
