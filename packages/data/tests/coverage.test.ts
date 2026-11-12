import { describe, expect, it } from 'vitest';

import { measureBridgeCoverage, type DataBundle } from '../src/index.ts';

import {
  classificationOf,
  regionalOccupation,
  sampleContents,
  scoredOccupation,
} from './support/builders.ts';

/** A bundle whose exposure dataset scores Software developers and Payroll clerks only. */
function bundleWith(classifications: DataBundle['classifications']): DataBundle {
  return {
    manifest: { formatVersion: 1, files: [], sources: [] },
    exposure: {
      majorGroups: [],
      occupations: [
        scoredOccupation('2512', 'Software developers', [0.6]),
        scoredOccupation('4313', 'Payroll clerks', [0.8]),
      ],
    },
    classifications,
    labour: sampleContents().labour,
  };
}

describe('measureBridgeCoverage', () => {
  const { eu, us } = sampleContents().classifications;

  it('counts an occupation as scored only when its first link is a scored unit group', () => {
    const uk = classificationOf('uk', [
      regionalOccupation('2134', 'Programmers and software development professionals', ['2512']),
      regionalOccupation('4214', 'Company secretaries', ['3343', '4313']),
      regionalOccupation('1111', 'Chief executives and senior officials'),
    ]);

    const coverage = measureBridgeCoverage(bundleWith({ eu, us, uk }));

    expect(coverage.find((entry) => entry.region === 'uk')).toMatchObject({
      occupations: 3,
      scoredOccupations: 1,
    });
  });

  it("lets a title's own code decide, and its occupation decide otherwise", () => {
    const uk = classificationOf('uk', [
      regionalOccupation(
        '4122',
        'Book-keepers, payroll managers and wages clerks',
        ['4311'],
        [
          { text: 'Payroll clerk', language: 'en', isco08: '4313' },
          { text: 'Book-keeper', language: 'en' },
        ],
      ),
      regionalOccupation(
        '2134',
        'Programmers and software development professionals',
        ['2512'],
        [
          { text: 'Software developer', language: 'en' },
          { text: 'Web designer', language: 'en', isco08: '2166' },
        ],
      ),
    ]);

    const coverage = measureBridgeCoverage(bundleWith({ eu, us, uk }));

    expect(coverage.find((entry) => entry.region === 'uk')).toMatchObject({
      titles: 4,
      scoredTitles: 2,
    });
  });

  it('reports every region of the bundle', () => {
    const { uk } = sampleContents().classifications;

    const coverage = measureBridgeCoverage(bundleWith({ eu, us, uk }));

    expect(coverage).toEqual([
      { region: 'eu', occupations: 1, scoredOccupations: 1, titles: 0, scoredTitles: 0 },
      { region: 'us', occupations: 1, scoredOccupations: 1, titles: 0, scoredTitles: 0 },
      { region: 'uk', occupations: 1, scoredOccupations: 1, titles: 0, scoredTitles: 0 },
    ]);
  });
});
