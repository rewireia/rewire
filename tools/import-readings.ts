/**
 * Writes the readings of the library from one or more lists of candidate readings.
 *
 *   tsx tools/import-readings.ts [--per-kind 25] first.json [second.json ...]
 *
 * Each file is a JSON list in the schema of `packages/content/src/library/schema.ts`. A document
 * listed in more than one file is kept once, the first time it appears. Then `--per-kind`
 * readings of each kind are kept, with scopes and topics as even as the candidates allow.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { mergeReadings, selectReadings } from '@rewire/content';
import { format, resolveConfig } from 'prettier';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const READINGS_FILE = path.join(ROOT, 'packages', 'content', 'src', 'library', 'readings.json');

const { positionals: files, values: flags } = parseArgs({
  allowPositionals: true,
  options: { 'per-kind': { type: 'string', default: '25' } },
});
const perKind = Number(flags['per-kind']);

if (files.length === 0 || !Number.isInteger(perKind) || perKind < 1) {
  console.error('usage: import-readings.ts [--per-kind 25] first.json [second.json ...]');
  process.exit(2);
}

const lists = await Promise.all(
  files.map(async (file) => JSON.parse(await readFile(file, 'utf8')) as unknown),
);
const merged = mergeReadings(lists);
const { readings, leftOut } = selectReadings(merged.readings, perKind);
const options = await resolveConfig(READINGS_FILE);
await writeFile(
  READINGS_FILE,
  await format(JSON.stringify(readings), { ...options, filepath: READINGS_FILE }),
);

const count = (key: 'type' | 'scope', value: string) =>
  readings.filter((reading) => reading[key] === value).length;
console.log(
  `wrote ${path.relative(ROOT, READINGS_FILE)}: ${readings.length} readings ` +
    `(${count('type', 'note')} notes, ${count('type', 'guide')} guides, ` +
    `${count('type', 'report')} reports; ${count('scope', 'global')} global, ` +
    `${count('scope', 'eu')} EU, ${count('scope', 'us')} US, ${count('scope', 'uk')} UK)`,
);
for (const reading of merged.duplicates) {
  console.log(`left out as a duplicate: ${reading.id} (${reading.url})`);
}
for (const reading of leftOut) {
  console.log(`left out to keep the balance: ${reading.id} (${reading.type}, ${reading.scope})`);
}
