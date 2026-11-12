/**
 * Builds the data bundle from its official sources, or checks the one in the repository.
 *
 *   npm run data:build              download what is not cached, then write the bundle
 *   npm run data:build -- --offline use the cache only
 *   npm run data:check              verify the committed bundle, without the network
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { DEFAULT_BUNDLE_DIRECTORY, measureBridgeCoverage, type DataBundle } from '../src/index.ts';

import { assembleBundle } from './assemble.ts';
import { checkBundle } from './check-bundle.ts';
import { writeBundle } from './write-bundle.ts';

const CACHE_DIRECTORY = fileURLToPath(new URL('../.cache/', import.meta.url));

const { values: flags } = parseArgs({
  options: {
    check: { type: 'boolean', default: false },
    offline: { type: 'boolean', default: false },
  },
});

if (!flags.check) {
  const contents = await assembleBundle({
    cacheDirectory: CACHE_DIRECTORY,
    offline: flags.offline,
    userAgent: process.env['DATA_PIPELINE_USER_AGENT'],
  });
  const today = new Date().toISOString().slice(0, 10);
  const manifest = await writeBundle(DEFAULT_BUNDLE_DIRECTORY, contents, today);
  for (const entry of manifest.files) {
    console.log(`wrote ${entry.file.padEnd(28)} ${megabytes(entry.bytes)}`);
  }
  for (const note of contents.notes) {
    console.log(`note: ${note}`);
  }
}

report(await checkBundle(DEFAULT_BUNDLE_DIRECTORY));

function report(bundle: DataBundle): void {
  const { occupations } = bundle.exposure;
  const tasks = occupations.reduce((count, occupation) => count + occupation.tasks.length, 0);
  console.log(`bundle is whole: ${path.relative(process.cwd(), DEFAULT_BUNDLE_DIRECTORY)}`);
  console.log(`exposure: ${occupations.length} unit groups, ${tasks} tasks`);
  for (const coverage of measureBridgeCoverage(bundle)) {
    console.log(
      `${coverage.region}: ${share(coverage.scoredOccupations, coverage.occupations)} of ` +
        `${coverage.occupations} occupations and ${share(coverage.scoredTitles, coverage.titles)} of ` +
        `${coverage.titles} job titles reach a scored unit group`,
    );
  }
}

function share(part: number, whole: number): string {
  return `${((100 * part) / whole).toFixed(1)}%`;
}

function megabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
