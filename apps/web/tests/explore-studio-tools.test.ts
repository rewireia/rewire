import type { AgFilterDefinition } from 'ag-studio';
import { describe, expect, it } from 'vitest';

import { describeFilter, occupationOf } from '../src/features/explorer/studio/context-menu.ts';
import { pickOccupation } from '../src/features/explorer/studio/focus/focus-pick.ts';
import { flowLayout } from '../src/features/explorer/studio/responsive.ts';

const row = (isco08: string, exposure: number) => ({ code: isco08, rank: exposure });

describe('the occupation in focus', () => {
  it('is the only one left, or the first by the mapped figure', () => {
    expect(pickOccupation([row('4131', 65)], 'code', 'rank')).toEqual({ isco08: '4131', among: 1 });
    expect(pickOccupation([row('1111', 31), row('4132', 70)], 'code', 'rank')).toEqual({
      isco08: '4132',
      among: 2,
    });
  });

  it('is none when the filters leave no occupation', () => {
    expect(pickOccupation([], 'code', 'rank')).toEqual({ isco08: null, among: 0 });
    expect(pickOccupation([{ code: 'Total' }], 'code', undefined)).toEqual({
      isco08: null,
      among: 0,
    });
  });
});

describe('the menu of a row or a bar', () => {
  const rowFilter: AgFilterDefinition = {
    operator: 'AND',
    conditions: [
      { field: { id: 'occupations.isco08' }, operator: 'equals', value: '4131' },
      { field: { id: 'occupations.title' }, operator: 'equals', value: 'Typists' },
    ],
  };

  it('finds the occupation a row is about', () => {
    expect(occupationOf(rowFilter)).toBe('4131');
    expect(
      occupationOf({ field: { id: 'majorGroups.majorGroup' }, operator: 'equals', value: '4' }),
    ).toBeUndefined();
    expect(occupationOf(undefined)).toBeUndefined();
  });

  it('says what a drill-through keeps', () => {
    expect(describeFilter(rowFilter)).toBe('4131 · Typists');
  });
});

describe('the layout on a narrower canvas', () => {
  const candidate = (xTrack: number, yTrack: number, xSpan: number, ySpan: number) => ({
    layout: { xTrack, yTrack, xSpan, ySpan },
    minSize: { xSpan: 4, ySpan: 4 },
  });

  it('gives narrow widgets half the page and wide ones all of it, in reading order', () => {
    const layouts = flowLayout(
      [
        candidate(6, 0, 6, 7),
        candidate(0, 0, 6, 7),
        candidate(0, 7, 24, 10),
        candidate(12, 0, 6, 7),
      ],
      24,
    );
    expect(layouts).toEqual([
      { xTrack: 12, yTrack: 0, xSpan: 12, ySpan: 7 },
      { xTrack: 0, yTrack: 0, xSpan: 12, ySpan: 7 },
      { xTrack: 0, yTrack: 14, xSpan: 24, ySpan: 10 },
      { xTrack: 0, yTrack: 7, xSpan: 12, ySpan: 7 },
    ]);
  });
});
