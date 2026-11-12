import { describe, expect, it } from 'vitest';
import { chosenOccupation } from '../src/features/report/ReportPage.tsx';

const profile = {
  region: 'eu' as const,
  occupation: { code: 'regional', title: 'Saved occupation', isco08: '9411' },
};

describe('report regional occupation', () => {
  it('uses the complete URL occupation ahead of the saved occupation', () => {
    expect(chosenOccupation('eu', '9411', 'url', 'URL occupation', profile)).toEqual({
      code: 'url',
      title: 'URL occupation',
    });
  });
  it('recovers the saved occupation only for the same region and group', () => {
    expect(chosenOccupation('eu', '9411', null, null, profile)).toEqual({
      code: 'regional',
      title: 'Saved occupation',
    });
    expect(chosenOccupation('us', '9411', null, null, profile)).toBeNull();
    expect(chosenOccupation('eu', '4313', null, null, profile)).toBeNull();
    expect(chosenOccupation('eu', '9411', null, null, null)).toBeNull();
  });
});
