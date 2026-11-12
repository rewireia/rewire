/**
 * Builds the snapshot of the official catalogue of training specialties of the SEPE from an
 * export of that catalogue. It reads only the file it is given.
 *
 *   tsx tools/import-sepe.ts --input <export.json> --exported-on YYYY-MM-DD
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { format, resolveConfig } from 'prettier';
import { z } from 'zod';

import { sepeSnapshotOf } from './sepe-rules.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SNAPSHOT_FILE = path.join(
  ROOT,
  'packages',
  'content',
  'src',
  'courses',
  'listed',
  'sepe.json',
);

const { values: flags } = parseArgs({
  options: { input: { type: 'string' }, 'exported-on': { type: 'string' } },
});
const input = z.string().min(1).parse(flags.input);
const exportedOn = z.iso.date().parse(flags['exported-on']);

const snapshot = sepeSnapshotOf(JSON.parse(await readFile(input, 'utf8')), exportedOn);
const options = await resolveConfig(SNAPSHOT_FILE);
await writeFile(
  SNAPSHOT_FILE,
  await format(JSON.stringify(snapshot), { ...options, parser: 'json' }),
);
console.log(
  `${snapshot.courses.length} specialties written to ${path.relative(ROOT, SNAPSHOT_FILE)}`,
);
