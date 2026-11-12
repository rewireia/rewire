import { describe, expect, it } from 'vitest';

import { resolveUnitGroup } from '../src/index.ts';

import { occupation } from './support/builders.ts';

const CLOSE_TO_2512 = { isco08: '2512', basis: 'close-match', support: 3 } as const;
const BROAD_TO_2511 = { isco08: '2511', basis: 'broad-match', support: 1 } as const;
const SOFTWARE_DEVELOPERS = occupation('15-1252.00', 'Software Developers', [
  CLOSE_TO_2512,
  BROAD_TO_2511,
]);

describe('resolveUnitGroup', () => {
  it('proposes the first link of the occupation and offers the rest as alternatives', () => {
    expect(resolveUnitGroup(SOFTWARE_DEVELOPERS)).toEqual({
      isco08: '2512',
      basis: 'close-match',
      alternatives: [BROAD_TO_2511],
    });
  });

  it('lets a title coded on its own win over the links of its occupation', () => {
    expect(resolveUnitGroup(SOFTWARE_DEVELOPERS, { isco08: '2511' })).toEqual({
      isco08: '2511',
      basis: 'job-title',
      alternatives: [CLOSE_TO_2512],
    });
  });

  it('uses the code of a title even when its occupation has no link', () => {
    const unlinked = occupation('2134', 'Programmers and software development professionals');

    expect(resolveUnitGroup(unlinked, { isco08: '2512' })).toEqual({
      isco08: '2512',
      basis: 'job-title',
      alternatives: [],
    });
  });

  it('proposes nothing when neither the occupation nor the title reach ISCO-08', () => {
    const unlinked = occupation('55-1011.00', 'Air Crew Officers');

    expect(resolveUnitGroup(unlinked)).toBeUndefined();
    expect(resolveUnitGroup(unlinked, {})).toBeUndefined();
  });
});
