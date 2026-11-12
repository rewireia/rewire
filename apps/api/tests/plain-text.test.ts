import { describe, expect, it } from 'vitest';

import { plainText, speakingPlainly } from '../src/modules/guide/plain-text.ts';

describe('the words of a model as the page prints them', () => {
  it('keep the words a model stressed and lose the marks', () => {
    expect(plainText('Start with **Introduction to AI**, a free course.')).toBe(
      'Start with Introduction to AI, a free course.',
    );
    expect(plainText('It is __free__ and **short**.')).toBe('It is free and short.');
  });

  it('leave alone an asterisk or an underscore that marks nothing', () => {
    expect(plainText('O*NET lists 1,016 occupations.')).toBe('O*NET lists 1,016 occupations.');
    expect(plainText('2 * 3 and 4 ** 5')).toBe('2 * 3 and 4 ** 5');
    expect(plainText('read_learning_plan [T2]')).toBe('read_learning_plan [T2]');
  });

  it('apply to every answer of a model', async () => {
    const model = speakingPlainly({
      complete: () => Promise.resolve({ text: 'A **calm** answer.', tokens: 7 }),
    });
    expect(await model.complete({ system: '', turns: [], tools: [] })).toEqual({
      text: 'A calm answer.',
      tokens: 7,
    });
  });
});
