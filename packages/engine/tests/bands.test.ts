import { describe, expect, it } from 'vitest';

import { TASK_BANDS, taskBandOf } from '../src/index.ts';

describe('taskBandOf', () => {
  it('places each threshold of the ILO in the band it opens', () => {
    expect(taskBandOf(0)).toBe('very-low');
    expect(taskBandOf(0.25)).toBe('low');
    expect(taskBandOf(0.5)).toBe('medium');
    expect(taskBandOf(0.75)).toBe('high');
  });

  it('keeps a score just below a threshold in the band beneath', () => {
    expect(taskBandOf(0.2499)).toBe('very-low');
    expect(taskBandOf(0.4999)).toBe('low');
    expect(taskBandOf(0.7499)).toBe('medium');
    expect(taskBandOf(1)).toBe('high');
  });

  it('never moves to a less exposed band as the score rises', () => {
    let previous = TASK_BANDS.indexOf(taskBandOf(0));
    for (let hundredths = 1; hundredths <= 100; hundredths += 1) {
      const position = TASK_BANDS.indexOf(taskBandOf(hundredths / 100));
      expect(position).toBeLessThanOrEqual(previous);
      previous = position;
    }
  });
});

describe('TASK_BANDS', () => {
  it('lists every band from the most to the least exposed', () => {
    expect(TASK_BANDS).toEqual(['high', 'medium', 'low', 'very-low']);
  });
});
