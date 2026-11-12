import { describe, expect, it } from 'vitest';

import { exposureDatasetSchema } from '../src/index.ts';

import { sampleContents } from './support/builders.ts';

describe('exposureDatasetSchema', () => {
  it('accepts a dataset that names the major group of every unit group', () => {
    const { exposure } = sampleContents();

    expect(exposureDatasetSchema.parse(exposure)).toEqual(exposure);
  });

  it('rejects a unit group whose major group the dataset does not name', () => {
    const exposure = { ...sampleContents().exposure, majorGroups: [] };

    expect(() => exposureDatasetSchema.parse(exposure)).toThrow(
      'Major group 2 of unit group 2512 has no title in majorGroups.',
    );
  });
});
