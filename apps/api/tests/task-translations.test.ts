import type { ExposureProfile } from '@rewire/engine';
import { describe, expect, it, vi } from 'vitest';

import {
  createTaskTranslations,
  type TaskTranslationModel,
} from '../src/modules/exposure/translation.ts';
import { createTokenBudget } from '../src/modules/guide/token-budget.ts';
import { createTestClock } from './support/test-api.ts';

const profile = {
  isco08: '1234',
  tasks: [
    { id: 'a', text: 'Check 2 items' },
    { id: 'b', text: 'Write reports' },
  ],
} as unknown as ExposureProfile;
const budget = () =>
  createTokenBudget(
    { dailyTokens: 1000, tokensPerCall: 100, concurrentCalls: 2 },
    createTestClock(),
  );
const answer = (translations: unknown) => ({ text: JSON.stringify({ translations }), tokens: 10 });
const valid = [
  { id: 'b', text: 'Redactar informes' },
  { id: 'a', text: 'Revisar 2 elementos' },
];

describe('task translations', () => {
  it('coalesces concurrent requests, caches validated results and preserves canonical order', async () => {
    const translate = vi.fn<TaskTranslationModel['translate']>().mockResolvedValue(answer(valid));
    const get = createTaskTranslations({ translate }, budget());
    const [first, second] = await Promise.all([get(profile), get(profile)]);
    expect(first).toEqual({ language: 'es', translations: [valid[1], valid[0]] });
    expect(second).toEqual(first);
    expect(await get(profile)).toEqual(first);
    expect(translate).toHaveBeenCalledTimes(1);
    expect(translate.mock.calls[0]?.[0]).toEqual(profile.tasks);
  });

  it.each([
    [{ id: 'a', text: 'Revisar 2 elementos' }],
    [
      { id: 'a', text: 'Revisar 2 elementos' },
      { id: 'a', text: 'Otro' },
    ],
    [{ id: 'a', text: 'Revisar 3 elementos' }, valid[0]],
    [
      { id: 'a', text: 'Revisar 2 elementos' },
      { id: 'invented', text: 'Otro' },
    ],
  ])(
    'rejects incomplete, duplicate, altered-number or invented tasks and retries',
    async (...translations) => {
      const translate = vi
        .fn<TaskTranslationModel['translate']>()
        .mockResolvedValueOnce(answer(translations))
        .mockResolvedValueOnce(answer(valid));
      const get = createTaskTranslations({ translate }, budget());
      await expect(get(profile)).rejects.toMatchObject({ status: 503 });
      await expect(get(profile)).resolves.toMatchObject({ language: 'es' });
      expect(translate).toHaveBeenCalledTimes(2);
    },
  );

  it('fails safely when no model is configured', async () => {
    await expect(createTaskTranslations(undefined, budget())(profile)).rejects.toMatchObject({
      status: 503,
    });
  });
});
