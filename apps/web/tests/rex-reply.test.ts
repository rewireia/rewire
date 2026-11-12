import { describe, expect, it } from 'vitest';

import { translate } from '../src/i18n/format.ts';
import { rexReply } from '../src/features/courses/rex-reply.ts';

const ai = { engine: 'ai' as const, matches: [] };
const rules = { engine: 'rules' as const, matches: [] };

describe('rexReply', () => {
  it('says a failure plainly', () => {
    expect(rexReply(null, 0, false)).toEqual({
      key: 'courses.rex.reply.error',
      count: 0,
      byRules: false,
    });
  });

  it('tells nothing found apart from nothing more', () => {
    expect(rexReply(ai, 0, false).key).toBe('courses.rex.reply.none');
    expect(rexReply(ai, 0, true).key).toBe('courses.rex.reply.noMore');
    expect(rexReply(rules, 0, false).byRules).toBe(false);
  });

  it('counts only the courses shown, and says when the words chose them', () => {
    expect(rexReply(ai, 1, false)).toEqual({
      key: 'courses.rex.reply.one',
      count: 1,
      byRules: false,
    });
    expect(rexReply(rules, 4, false)).toEqual({
      key: 'courses.rex.reply.many',
      count: 4,
      byRules: true,
    });
    expect(rexReply(ai, 3, true).key).toBe('courses.rex.reply.more');
  });

  it('is written by the web in both languages with the number of the answer', () => {
    const reply = rexReply(ai, 4, false);
    expect(translate('en', reply.key, { count: reply.count })).toBe(
      'Here are 4 courses that fit what you are looking for.',
    );
    expect(translate('es', reply.key, { count: reply.count })).toBe(
      'Te propongo 4 cursos que encajan con lo que buscas.',
    );
  });
});
