/** Licences a production dependency may carry without a review. */
export const PERMITTED_LICENSES: ReadonlySet<string> = new Set([
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Unlicense',
  // The SIL Open Font License, for the typefaces the web serves unmodified.
  'OFL-1.1',
]);

/**
 * Commercial packages of AG Grid Ltd that pass by name, each with the reason. The explorer's
 * "Analyse" view is built on AG Studio, which brings the Enterprise grid and charts with it. They
 * are not open source and the MIT licence of this repository does not cover them: without a
 * licence key they run as AG Grid's trial, and use beyond evaluation needs a key from AG Grid.
 * Only these names, and only with the `Commercial` licence they declare, are let through.
 */
export const COMMERCIAL_EXCEPTIONS: ReadonlyMap<string, string> = new Map([
  ['ag-studio', 'the dashboard of the explorer\'s "Analyse" view'],
  ['ag-studio-react', 'the React component of AG Studio'],
  ['ag-grid-enterprise', 'the grid AG Studio is built on'],
  ['ag-charts-enterprise', 'the charts AG Studio is built on'],
]);

/** The licence the excepted packages declare; any other licence is checked as usual. */
const COMMERCIAL = 'Commercial';

/** Whether a package is one of the named commercial exceptions, declaring that licence. */
export function isNamedException(entry: PackageLicense): boolean {
  return entry.license === COMMERCIAL && COMMERCIAL_EXCEPTIONS.has(entry.name);
}

/** A parsed SPDX licence expression. */
export type LicenseExpression =
  | { readonly kind: 'license'; readonly id: string }
  | {
      readonly kind: 'and' | 'or';
      readonly left: LicenseExpression;
      readonly right: LicenseExpression;
    };

/** A production dependency as it appears in the notices. */
export interface PackageLicense {
  readonly name: string;
  readonly version: string;
  /** The SPDX expression the package declares, if it declares one. */
  readonly license: string | undefined;
}

/** The text is not an SPDX expression this tool can read. */
export class LicenseExpressionError extends Error {
  override readonly name = 'LicenseExpressionError';
}

const TOKEN = /\(|\)|[^\s()]+/g;

/**
 * Parses an SPDX expression such as `(MIT OR Apache-2.0) AND ISC`.
 *
 * `AND` binds tighter than `OR`, as the SPDX specification says. A `WITH` exception stays
 * part of the licence it qualifies, so `GPL-2.0 WITH Classpath-exception-2.0` is one term.
 */
export function parseLicenseExpression(text: string): LicenseExpression {
  const tokens = text.match(TOKEN) ?? [];
  let position = 0;
  const peek = (): string | undefined => tokens[position];
  const next = (): string | undefined => tokens[position++];

  const parseOr = (): LicenseExpression => {
    let left = parseAnd();
    while (peek()?.toUpperCase() === 'OR') {
      next();
      left = { kind: 'or', left, right: parseAnd() };
    }
    return left;
  };
  const parseAnd = (): LicenseExpression => {
    let left = parseTerm();
    while (peek()?.toUpperCase() === 'AND') {
      next();
      left = { kind: 'and', left, right: parseTerm() };
    }
    return left;
  };
  const parseTerm = (): LicenseExpression => {
    const token = next();
    if (token === '(') {
      const inner = parseOr();
      if (next() !== ')') {
        throw new LicenseExpressionError(`unbalanced parentheses in "${text}"`);
      }
      return inner;
    }
    if (token === undefined || token === ')' || isOperator(token)) {
      throw new LicenseExpressionError(`expected a licence in "${text}"`);
    }
    if (peek()?.toUpperCase() === 'WITH') {
      next();
      return { kind: 'license', id: `${token} WITH ${next() ?? ''}` };
    }
    return { kind: 'license', id: token };
  };

  const expression = parseOr();
  if (position !== tokens.length) {
    throw new LicenseExpressionError(`unexpected "${String(peek())}" in "${text}"`);
  }
  return expression;
}

function isOperator(token: string): boolean {
  return ['AND', 'OR', 'WITH'].includes(token.toUpperCase());
}

/** With `OR` the user may choose, so one permitted side is enough; `AND` needs both. */
export function isPermitted(
  expression: LicenseExpression,
  permitted: ReadonlySet<string> = PERMITTED_LICENSES,
): boolean {
  switch (expression.kind) {
    case 'license':
      return permitted.has(expression.id);
    case 'or':
      return isPermitted(expression.left, permitted) || isPermitted(expression.right, permitted);
    case 'and':
      return isPermitted(expression.left, permitted) && isPermitted(expression.right, permitted);
  }
}

/** Whether a declared licence is permitted; a missing or unreadable one never is. */
export function isPermittedLicense(license: string | undefined): boolean {
  if (license === undefined) {
    return false;
  }
  try {
    return isPermitted(parseLicenseExpression(license));
  } catch (error) {
    if (error instanceof LicenseExpressionError) {
      return false;
    }
    throw error;
  }
}

/** The packages whose licence needs a review before they can ship. */
export function findUnpermitted(packages: readonly PackageLicense[]): PackageLicense[] {
  return packages.filter((entry) => !isPermittedLicense(entry.license) && !isNamedException(entry));
}

/** Packages by name, then version, with duplicates of the same release removed. */
export function sortPackages(packages: readonly PackageLicense[]): PackageLicense[] {
  const unique = new Map(packages.map((entry) => [`${entry.name}@${entry.version}`, entry]));
  return [...unique.values()].sort(
    (a, b) => compareText(a.name, b.name) || compareText(a.version, b.version),
  );
}

function compareText(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/** The text of `THIRD_PARTY_NOTICES.md`, sorted so that it only changes when a dependency does. */
export function renderNotices(packages: readonly PackageLicense[]): string {
  const rows = sortPackages(packages).map(
    (entry) => `| ${entry.name} | ${entry.version} | ${entry.license ?? 'UNKNOWN'} |`,
  );
  return [
    '# Third-party notices',
    '',
    'Rewire ships with the following packages, installed as production dependencies. Each one',
    'is distributed under the licence shown. Those marked Commercial are software of AG Grid Ltd,',
    'not covered by the MIT licence of Rewire: see the Licence section of the README.',
    '',
    '| Package | Version | Licence |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}
