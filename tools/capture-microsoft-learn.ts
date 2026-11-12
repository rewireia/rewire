/**
 * Captures the public catalogue of Microsoft Learn into the snapshot the course catalogue
 * reads. It is run by hand, once per refresh, and is the only tool that goes to the network.
 *
 *   tsx tools/capture-microsoft-learn.ts                  read the catalogue and write the snapshot
 *   tsx tools/capture-microsoft-learn.ts --input <file>   build the snapshot from a saved answer
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { format, resolveConfig } from 'prettier';

import { MICROSOFT_LEARN_CATALOGUE, snapshotOf } from './microsoft-learn-rules.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SNAPSHOT_FILE = path.join(
  ROOT,
  'packages',
  'content',
  'src',
  'courses',
  'listed',
  'microsoft-learn.json',
);
/** A common desktop browser: the request says nothing about who sends it or why. */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/156.0.0.0 Safari/537.36';

const { values: flags } = parseArgs({ options: { input: { type: 'string' } } });

async function readCatalogue(): Promise<unknown> {
  if (flags.input !== undefined) return JSON.parse(await readFile(flags.input, 'utf8'));
  const response = await fetch(MICROSOFT_LEARN_CATALOGUE, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`The catalogue answered ${response.status}`);
  return response.json();
}

const today = new Date().toISOString().slice(0, 10);
const snapshot = snapshotOf(await readCatalogue(), today);
const options = await resolveConfig(SNAPSHOT_FILE);
await writeFile(
  SNAPSHOT_FILE,
  await format(JSON.stringify(snapshot), { ...options, parser: 'json' }),
);
console.log(`${snapshot.courses.length} courses written to ${path.relative(ROOT, SNAPSHOT_FILE)}`);
