import { describe, expect, it } from 'vitest';

import {
  COMMERCIAL_EXCEPTIONS,
  LicenseExpressionError,
  findUnpermitted,
  isNamedException,
  isPermittedLicense,
  parseLicenseExpression,
  renderNotices,
} from '../licence-rules.ts';

describe('parseLicenseExpression', () => {
  it('reads a single licence', () => {
    expect(parseLicenseExpression('MIT')).toEqual({ kind: 'license', id: 'MIT' });
  });

  it('binds AND tighter than OR', () => {
    expect(parseLicenseExpression('MIT OR ISC AND GPL-3.0')).toEqual({
      kind: 'or',
      left: { kind: 'license', id: 'MIT' },
      right: {
        kind: 'and',
        left: { kind: 'license', id: 'ISC' },
        right: { kind: 'license', id: 'GPL-3.0' },
      },
    });
  });

  it('keeps a WITH exception with its licence', () => {
    expect(parseLicenseExpression('GPL-2.0 WITH Classpath-exception-2.0')).toEqual({
      kind: 'license',
      id: 'GPL-2.0 WITH Classpath-exception-2.0',
    });
  });

  it.each(['', '(MIT', 'MIT OR', 'MIT ISC', 'AND MIT'])('rejects "%s"', (text) => {
    expect(() => parseLicenseExpression(text)).toThrow(LicenseExpressionError);
  });
});

describe('isPermittedLicense', () => {
  it.each([
    'MIT',
    'Apache-2.0',
    'BlueOak-1.0.0',
    '(MIT OR Apache-2.0)',
    'MIT AND ISC',
    'GPL-3.0 OR MIT',
    '(GPL-3.0 OR MIT) AND BSD-3-Clause',
  ])('permits %s', (license) => {
    expect(isPermittedLicense(license)).toBe(true);
  });

  it.each([
    'GPL-3.0',
    'MIT AND GPL-3.0',
    'LGPL-2.1 OR GPL-3.0',
    'GPL-2.0 WITH Classpath-exception-2.0',
    'SEE LICENSE IN LICENSE.txt',
    '(MIT',
    undefined,
  ])('does not permit %s', (license) => {
    expect(isPermittedLicense(license)).toBe(false);
  });
});

describe('findUnpermitted', () => {
  it('returns only the packages that need a review', () => {
    const permitted = { name: 'a', version: '1.0.0', license: 'MIT' };
    const copyleft = { name: 'b', version: '2.0.0', license: 'GPL-3.0' };
    const undeclared = { name: 'c', version: '3.0.0', license: undefined };
    expect(findUnpermitted([permitted, copyleft, undeclared])).toEqual([copyleft, undeclared]);
  });
});

describe('the commercial exceptions', () => {
  it('let through only the named AG Grid packages, and only as Commercial', () => {
    const studio = { name: 'ag-studio', version: '3.1.0', license: 'Commercial' };
    const enterprise = { name: 'ag-grid-enterprise', version: '36.3.0', license: 'Commercial' };
    const otherCommercial = { name: 'some-grid-pro', version: '1.0.0', license: 'Commercial' };
    const relicensed = { name: 'ag-studio', version: '9.0.0', license: 'GPL-3.0' };
    expect(isNamedException(studio)).toBe(true);
    expect(findUnpermitted([studio, enterprise, otherCommercial, relicensed])).toEqual([
      otherCommercial,
      relicensed,
    ]);
  });

  it('name the four packages AG Studio brings, and give each a reason', () => {
    expect([...COMMERCIAL_EXCEPTIONS.keys()].sort()).toEqual([
      'ag-charts-enterprise',
      'ag-grid-enterprise',
      'ag-studio',
      'ag-studio-react',
    ]);
    for (const reason of COMMERCIAL_EXCEPTIONS.values()) {
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});

describe('renderNotices', () => {
  it('lists each release once, sorted by name and version', () => {
    const text = renderNotices([
      { name: 'zod', version: '4.0.0', license: 'MIT' },
      { name: '@scope/tool', version: '2.0.0', license: 'ISC' },
      { name: 'zod', version: '3.0.0', license: 'MIT' },
      { name: 'zod', version: '4.0.0', license: 'MIT' },
    ]);
    const rows = text.split('\n').filter((line) => line.startsWith('| ') && !line.includes('---'));
    expect(rows).toEqual([
      '| Package | Version | Licence |',
      '| @scope/tool | 2.0.0 | ISC |',
      '| zod | 3.0.0 | MIT |',
      '| zod | 4.0.0 | MIT |',
    ]);
  });

  it('marks a package without a declared licence', () => {
    expect(renderNotices([{ name: 'a', version: '1.0.0', license: undefined }])).toContain(
      '| a | 1.0.0 | UNKNOWN |',
    );
  });
});
