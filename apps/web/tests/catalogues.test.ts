import { describe, expect, it } from 'vitest';

import { en } from '../src/i18n/en.ts';
import { es } from '../src/i18n/es.ts';

const placeholdersOf = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('message catalogues', () => {
  it('have the same keys in English and Spanish', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('use the same placeholders in both languages', () => {
    for (const [key, text] of Object.entries(en)) {
      // `Object.entries` widens keys to string; these come from `en` itself.
      expect(placeholdersOf(es[key as keyof typeof en]), key).toEqual(placeholdersOf(text));
    }
  });

  it('have no empty message', () => {
    for (const text of [...Object.values(en), ...Object.values(es)]) {
      expect(text.trim()).not.toBe('');
    }
  });
});
