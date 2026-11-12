import type { ExposureTask } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import { taskText } from '../src/components/task-text.ts';
import { mentionedTasks, splitReferences, taskAnchor } from '../src/features/report/references.ts';
import { sameTimes } from '../src/features/report/times.ts';

describe('task text', () => {
  it('ends a task published as a list item with a full stop', () => {
    expect(taskText('Maintaining records of attendance;')).toBe(
      'Maintaining records of attendance.',
    );
    expect(taskText('Preparing statements ;  ')).toBe('Preparing statements.');
  });

  it('leaves other tasks as they are', () => {
    expect(taskText('Verifying attendance.')).toBe('Verifying attendance.');
    expect(taskText('Uses a; semicolon inside')).toBe('Uses a; semicolon inside');
  });
});

describe('task references', () => {
  const task = (id: string, score: number): ExposureTask => ({
    id,
    text: `Task ${id}`,
    score,
    band: 'medium',
    range: { low: score, high: score },
    reviewedByExperts: false,
  });
  const tasks = [task('4313-5', 0.61), task('4313-1', 0.2), task('4313-2', 0.1)];

  it('turns [T2] into a reference to the second task, which carries its own score', () => {
    expect(splitReferences('Most of it [T2], and some [T1].', tasks)).toEqual([
      { kind: 'text', text: 'Most of it ' },
      { kind: 'task', number: 2, task: tasks[1] },
      { kind: 'text', text: ', and some ' },
      { kind: 'task', number: 1, task: tasks[0] },
      { kind: 'text', text: '.' },
    ]);
  });

  it('keeps a tag that points at no task as text', () => {
    expect(splitReferences('See [T9] here.', tasks)).toEqual([
      { kind: 'text', text: 'See [T9] here.' },
    ]);
  });

  it('lists the tasks the paragraphs mention, each once, in the order of the report', () => {
    expect(mentionedTasks(['Then [T3], first [T1].', 'Again [T3], and [T9].'], tasks)).toEqual([
      { number: 1, task: tasks[0] },
      { number: 3, task: tasks[2] },
    ]);
  });

  it('gives each task an anchor of its own', () => {
    expect(taskAnchor('4313-5')).toBe('task-4313-5');
  });
});

describe('saved times', () => {
  it('counts a task left out as "some"', () => {
    expect(sameTimes({ a: 'some' }, {})).toBe(true);
    expect(sameTimes({ a: 'most' }, { a: 'most', b: 'some' })).toBe(true);
    expect(sameTimes({ a: 'most' }, { a: 'little' })).toBe(false);
  });
});
