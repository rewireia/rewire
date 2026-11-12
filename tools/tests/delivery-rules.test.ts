import { describe, expect, it } from 'vitest';

import {
  maxLineLength,
  noLocalPaths,
  noPendingNotes,
  noSecrets,
  readmePerFolder,
} from '../delivery-rules.ts';

// Samples are assembled at run time so that this file passes the guard it tests.
const HOME = ['', 'Users', 'someone', 'project'].join('/');
const LINUX_HOME = ['', 'home', 'someone'].join('/');
const VOLUME = ['', 'Volumes', 'Disk', 'work'].join('/');
const DRIVE = 'C:' + '\\work';
const PENDING = 'TO' + 'DO';

describe('noLocalPaths', () => {
  it.each([HOME, LINUX_HOME, VOLUME, DRIVE, `file://${HOME}`])('flags %s', (sample) => {
    const findings = noLocalPaths('notes.md', `first line\nsee ${sample}\n`);
    expect(findings).toMatchObject([{ file: 'notes.md', line: 2, rule: 'no-local-paths' }]);
  });

  it.each([
    "import path from 'node:path';",
    'https://example.org/Users/guide',
    'const route = "/users/me";',
    'the docs/ folder and ./home/ page',
  ])('accepts %s', (sample) => {
    expect(noLocalPaths('a.ts', sample)).toEqual([]);
  });
});

describe('noSecrets', () => {
  const apiKey = 'sk-' + 'ant-' + 'x'.repeat(30);
  const accessKey = 'AKIA' + 'ABCDEFGHIJKLMNOP';
  const pem = '-----BEGIN ' + 'RSA PRIVATE KEY-----';

  it.each([apiKey, accessKey, pem])('flags %s', (sample) => {
    expect(noSecrets('a.ts', `const value = '${sample}';`)).toHaveLength(1);
  });

  it.each(['const label = "sk-short";', 'AKIA is the prefix of an access key'])(
    'accepts %s',
    (sample) => {
      expect(noSecrets('a.ts', sample)).toEqual([]);
    },
  );

  it('flags a filled-in secret variable in the environment template', () => {
    const template = [
      'PORT=8080',
      'PAYMENT_SECRET=abc',
      'export SESSION_TOKEN="xyz"',
      'API_KEY=',
      'DB_PASSWORD=""',
      'SIGNING_KEY= # set in production',
    ].join('\n');
    expect(noSecrets('.env.example', template).map((finding) => finding.line)).toEqual([2, 3]);
  });

  it('reads variable values only in the environment template', () => {
    expect(noSecrets('config.ts', 'PAYMENT_SECRET=abc')).toEqual([]);
  });
});

describe('noPendingNotes', () => {
  it.each([`// ${PENDING}: finish`, `<!-- ${'FIX' + 'ME'} -->`, `# ${'HA' + 'CK'} here`])(
    'flags %s',
    (sample) => {
      expect(noPendingNotes('a.ts', sample)).toHaveLength(1);
    },
  );

  it.each(['todo list in lower case', `${PENDING}S`, 'XXXX-0000'])('accepts %s', (sample) => {
    expect(noPendingNotes('a.ts', sample)).toEqual([]);
  });
});

describe('maxLineLength', () => {
  it('flags a code line over 120 characters', () => {
    const findings = maxLineLength('a.ts', `ok\nconst x = '${'y'.repeat(120)}';`);
    expect(findings).toMatchObject([
      {
        file: 'a.ts',
        line: 2,
        rule: 'max-line-length',
        message: '133 characters, over the limit of 120',
      },
    ]);
  });

  it('does not count a URL quoted in the line', () => {
    const line = `const source = 'https://example.org/${'path/'.repeat(30)}';`;
    expect(maxLineLength('a.tsx', line)).toEqual([]);
  });

  it('leaves alone a line that holds one message of a catalogue', () => {
    const message = `'${'A sentence for a person. '.repeat(8)}',`;
    expect(maxLineLength('en.ts', `  explanation: ${message}`)).toEqual([]);
    expect(maxLineLength('en.ts', `    ${message}`)).toEqual([]);
  });

  it('still flags a long line of code that only begins like a property', () => {
    const line = `  total: first + ${'second + '.repeat(20)}'last',`;
    expect(maxLineLength('a.ts', line)).toHaveLength(1);
  });

  it('reads only TypeScript files', () => {
    expect(maxLineLength('README.md', 'y'.repeat(200))).toEqual([]);
  });
});

describe('readmePerFolder', () => {
  it('asks for a README in every folder that holds a file', () => {
    const files = [
      'packages/data/package.json',
      'packages/data/README.md',
      'packages/data/src/index.ts',
      'packages/data/src/schema/manifest.ts',
      'packages/data/src/schema/README.md',
    ];
    expect(readmePerFolder(files).map((finding) => finding.file)).toEqual([
      'packages/README.md',
      'packages/data/src/README.md',
    ]);
  });

  it('asks for one however deep the folder is', () => {
    const files = [
      'apps/README.md',
      'apps/web/README.md',
      'apps/web/src/README.md',
      'apps/web/src/features/README.md',
      'apps/web/src/features/explorer/README.md',
      'apps/web/src/features/explorer/studio/analyst/tools.ts',
    ];
    expect(readmePerFolder(files).map((finding) => finding.file)).toEqual([
      'apps/web/src/features/explorer/studio/README.md',
      'apps/web/src/features/explorer/studio/analyst/README.md',
    ]);
  });

  it('asks for one in folders that hold no code, such as documents and images', () => {
    const files = ['docs/README.md', 'docs/images/home.png', 'tests/e2e/README.md', 'LICENSE'];
    expect(readmePerFolder(files).map((finding) => finding.file)).toEqual([
      'docs/images/README.md',
      'tests/README.md',
    ]);
  });

  it('asks for none where a README would be published or shown in place of the main one', () => {
    const files = [
      '.github/workflows/README.md',
      '.github/workflows/verify.yml',
      'apps/README.md',
      'apps/web/README.md',
      'apps/web/public/favicon.svg',
    ];
    expect(readmePerFolder(files)).toEqual([]);
  });

  it('is content with a repository whose every folder explains itself', () => {
    const files = [
      'README.md',
      'tools/README.md',
      'tools/tests/README.md',
      'tools/tests/a.test.ts',
    ];
    expect(readmePerFolder(files)).toEqual([]);
  });
});
