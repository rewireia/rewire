import { describe, expect, it } from 'vitest';

import { privacyKeys } from '../src/features/guide/privacy.ts';
import type { en } from '../src/i18n/en.ts';
import { es } from '../src/i18n/es.ts';
import { translate } from '../src/i18n/format.ts';

/** The sentences as the privacy page writes them, with the name of the product in place. */
const said = (keys: readonly (keyof typeof en)[]) =>
  keys.map((key) => translate('en', key)).join(' ');

describe('where the privacy page says a person’s words go', () => {
  it('names OpenAI when its model answers Rex and Tempo', () => {
    const text = said(privacyKeys({ provider: 'openai', usedToImproveModels: false }));
    expect(text).toBe(
      'What you write to Rex or to Tempo is sent to an OpenAI model, which answers it.',
    );
  });

  it('says so when the provider may learn from what is written, and asks for no personal details', () => {
    const keys = privacyKeys({ provider: 'openai', usedToImproveModels: true });
    expect(keys).toEqual(['method.privacy.guide.openai', 'guide.privacy.learns']);
    expect(said(keys)).toContain('may use it to improve its models');
    expect(said(keys)).toContain('leave out personal details');
    expect(es[keys[0] ?? 'guide.privacy.learns']).toContain('OpenAI');
  });

  it('claims no provider the server did not name', () => {
    const text = said(privacyKeys({ provider: null, usedToImproveModels: false }));
    expect(text).toContain('an AI model outside Rewire');
    expect(text).not.toContain('OpenAI');
  });
});
