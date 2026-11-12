/**
 * Writes the data sources page from the bundle manifest, or checks that it is up to date.
 *
 *   tsx tools/data-sources.ts --write   write docs/data-sources.md
 *   tsx tools/data-sources.ts --check   fail when the page differs from the manifest
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { BUNDLE_FILES, DEFAULT_BUNDLE_DIRECTORY, bundleManifestSchema } from '@rewire/data';
import { format, resolveConfig } from 'prettier';

import { renderDataSources } from './data-sources-doc.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PAGE_FILE = path.join(ROOT, 'docs', 'data-sources.md');
const MANIFEST_FILE = path.join(DEFAULT_BUNDLE_DIRECTORY, BUNDLE_FILES.manifest);

const { values: flags } = parseArgs({
  options: {
    write: { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
  },
});

if (flags.write === flags.check) {
  console.error('usage: data-sources.ts --write | --check');
  process.exit(2);
}

const manifestText = await readIfPresent(MANIFEST_FILE);
if (manifestText === undefined) {
  console.error(
    `${path.relative(ROOT, MANIFEST_FILE)} does not exist: build the bundle with npm run data:build`,
  );
  process.exit(1);
}

const manifest = bundleManifestSchema.parse(JSON.parse(manifestText));
const page = await formatAsRepository(renderDataSources(manifest));

if (flags.write) {
  await writeFile(PAGE_FILE, page);
  console.log(`wrote docs/data-sources.md: ${manifest.sources.length} sources`);
} else if ((await readIfPresent(PAGE_FILE)) === page) {
  console.log(`docs/data-sources.md is up to date: ${manifest.sources.length} sources`);
} else {
  console.error('docs/data-sources.md is not up to date: run tools/data-sources.ts --write');
  process.exit(1);
}

/** The page is formatted as the rest of the repository, so the format check accepts it. */
async function formatAsRepository(markdown: string): Promise<string> {
  const options = await resolveConfig(PAGE_FILE);
  return format(markdown, { ...options, filepath: PAGE_FILE });
}

async function readIfPresent(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}
