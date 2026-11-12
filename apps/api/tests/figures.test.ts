import { describe, expect, it } from 'vitest';

import { figuresIn, taskReferencesBeyond } from '../src/modules/guide/figures.ts';

import { readCorpus, scoreOf, type CorpusEntry } from './support/corpus.ts';

const corpus = readCorpus('prose-figures.json');
const outcome = ({ text }: CorpusEntry) => (figuresIn(text).length > 0 ? 'figure' : 'none');
const score = scoreOf(corpus, outcome);

describe('the figure detector, on its corpus', () => {
  it(`gets ${String(score.right)} of ${String(score.total)} sentences right (${String(score.percent)} %)`, () => {
    expect(score.total).toBeGreaterThanOrEqual(50);
    expect(score.right).toBe(score.total - score.limits);
  });

  it.each(corpus.filter((entry) => entry.limit === undefined))(
    'reads "$text" as $expect',
    (entry) => {
      expect(outcome(entry)).toBe(entry.expect);
    },
  );

  it.each(corpus.filter((entry) => entry.limit !== undefined))(
    'still gets "$text" wrong, a known limit',
    (entry) => {
      expect(outcome(entry)).not.toBe(entry.expect);
    },
  );
});

describe('the figures of a text', () => {
  it('are listed as written, in the order they stand', () => {
    expect(figuresIn('About 43 of 100, since 2025, or 12,5.')).toEqual([
      '43',
      '100',
      '2025',
      '12,5',
    ]);
    expect(figuresIn('Ninety percent, or half.')).toEqual(['Ninety', 'half']);
  });

  it('leave out the number of a task tag', () => {
    expect(figuresIn('The first task [T7] stands out, and [T12] too.')).toEqual([]);
  });
});

describe('the task reference check', () => {
  it('accepts tags of tasks the report has', () => {
    expect(taskReferencesBeyond('See [T1] and [T5].', 5)).toEqual([]);
  });

  it('names tags that point at no task', () => {
    expect(taskReferencesBeyond('See [T0], [T3] and [T6].', 5)).toEqual(['[T0]', '[T6]']);
  });
});
