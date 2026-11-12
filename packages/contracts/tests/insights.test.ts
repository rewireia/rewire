import { describe, expect, it } from 'vitest';

import { regionInsightsSchema } from '../src/index.ts';

const SOURCE = {
  id: 'ilo-genai-exposure',
  title: 'Index',
  publisher: 'ILO',
  version: 'WP 140',
  url: 'https://example.org/',
  retrievedOn: '2026-11-11',
};

const MINIMAL = {
  region: 'eu',
  index: {
    source: SOURCE,
    unitGroups: 1,
    byGradient: [{ gradient: 'minimal', unitGroups: 1 }],
    byBand: [{ band: 'low', unitGroups: 1 }],
    mostExposed: [{ isco08: '2511', title: 'Analysts', meanScore: 0.4, gradient: 'minimal' }],
    leastExposed: [],
  },
  majorGroups: [
    {
      code: '2',
      title: 'Professionals',
      meanScore: 0.4,
      unitGroups: 1,
      employed: null,
      employedShare: null,
    },
  ],
  employment: null,
  pay: null,
};

describe('regionInsightsSchema', () => {
  it('accepts a region whose sources publish no labour figures', () => {
    expect(regionInsightsSchema.parse(MINIMAL).employment).toBeNull();
  });

  it('refuses a score outside 0 to 1 and a source without its retrieval day', () => {
    const tooHigh = { ...MINIMAL, majorGroups: [{ ...MINIMAL.majorGroups[0], meanScore: 1.2 }] };
    expect(regionInsightsSchema.safeParse(tooHigh).success).toBe(false);
    const undated = {
      ...MINIMAL,
      index: { ...MINIMAL.index, source: { ...SOURCE, retrievedOn: '' } },
    };
    expect(regionInsightsSchema.safeParse(undated).success).toBe(false);
  });

  it('refuses a major group code longer than one digit', () => {
    const wrong = { ...MINIMAL, majorGroups: [{ ...MINIMAL.majorGroups[0], code: '25' }] };
    expect(regionInsightsSchema.safeParse(wrong).success).toBe(false);
  });
});
