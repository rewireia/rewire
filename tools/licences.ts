/**
 * Lists the licence of every production dependency and checks that each one is permitted.
 *
 *   tsx tools/licences.ts --write   write THIRD_PARTY_NOTICES.md
 *   tsx tools/licences.ts --check   fail on an unpermitted licence or a stale notices file
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { z } from 'zod';

import { findUnpermitted, renderNotices, type PackageLicense } from './licence-rules.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const NOTICES_FILE = path.join(ROOT, 'THIRD_PARTY_NOTICES.md');
const INSTALL_FOLDER = 'node_modules/';

const lockfileSchema = z.object({
  packages: z.record(
    z.string(),
    z.object({
      version: z.string().optional(),
      license: z.string().optional(),
      dev: z.boolean().optional(),
      devOptional: z.boolean().optional(),
      link: z.boolean().optional(),
    }),
  ),
});

/** Old packages declare `{ type }` or a `licenses` list instead of an SPDX string. */
const manifestLicenseSchema = z.object({
  license: z.union([z.string(), z.object({ type: z.string() })]).optional(),
  licenses: z.array(z.object({ type: z.string() })).optional(),
});

const { values: flags } = parseArgs({
  options: {
    write: { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
  },
});

if (flags.write === flags.check) {
  console.error('usage: licences.ts --write | --check');
  process.exit(2);
}

const packages = await readProductionPackages();
const notices = renderNotices(packages);

if (flags.write) {
  await writeFile(NOTICES_FILE, notices);
  console.log(`wrote THIRD_PARTY_NOTICES.md: ${packages.length} production packages`);
} else {
  const problems = [
    ...findUnpermitted(packages).map(
      (entry) =>
        `${entry.name}@${entry.version} has an unpermitted licence: ${entry.license ?? 'none'}`,
    ),
    ...((await readIfPresent(NOTICES_FILE)) === notices
      ? []
      : ['THIRD_PARTY_NOTICES.md is not up to date: run tools/licences.ts --write']),
  ];
  for (const problem of problems) {
    console.error(problem);
  }
  if (problems.length > 0) {
    process.exit(1);
  }
  console.log(`licences permitted and notices up to date: ${packages.length} production packages`);
}

/**
 * Every installed package that is not a development dependency or one of our workspaces.
 *
 * The lockfile says which packages ship; the installed `package.json` is preferred for the
 * licence because it is what the publisher wrote, while the lockfile keeps it for packages
 * this platform does not install.
 */
async function readProductionPackages(): Promise<PackageLicense[]> {
  const lockfile = lockfileSchema.parse(
    JSON.parse(await readFile(path.join(ROOT, 'package-lock.json'), 'utf8')),
  );
  const entries = Object.entries(lockfile.packages).filter(
    ([key, entry]) =>
      key.includes(INSTALL_FOLDER) &&
      entry.dev !== true &&
      entry.devOptional !== true &&
      entry.link !== true,
  );
  return Promise.all(
    entries.map(async ([key, entry]) => ({
      name: key.slice(key.lastIndexOf(INSTALL_FOLDER) + INSTALL_FOLDER.length),
      version: entry.version ?? 'unknown',
      license: (await readInstalledLicense(key)) ?? entry.license,
    })),
  );
}

async function readInstalledLicense(packageFolder: string): Promise<string | undefined> {
  const text = await readIfPresent(path.join(ROOT, packageFolder, 'package.json'));
  if (text === undefined) {
    return undefined;
  }
  const { license, licenses } = manifestLicenseSchema.parse(JSON.parse(text));
  if (typeof license === 'string') {
    return license;
  }
  if (license !== undefined) {
    return license.type;
  }
  return licenses?.map((entry) => entry.type).join(' OR ');
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
