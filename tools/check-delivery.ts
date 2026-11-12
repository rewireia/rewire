/**
 * Checks what the repository would publish: no machine paths, credentials or pending notes,
 * a README in every code folder and code lines of a readable length.
 *
 *   tsx tools/check-delivery.ts   print the findings by rule; exit with 1 if there are any
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FILE_RULES, readmePerFolder, type Finding } from './delivery-rules.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** Folders skipped wherever they appear: installed, built or produced by a test run. */
const SKIPPED_FOLDER_NAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  'coverage',
  'test-results',
  'playwright-report',
]);

/**
 * Paths skipped from the root: generated data, the lockfile, and what `.gitignore` keeps
 * out of the repository, such as local environment files and the local database.
 */
const SKIPPED_PATHS = new Set([
  'packages/data/.cache',
  'packages/data/bundle',
  'package-lock.json',
  'apps/api/var',
  '.env',
  '.envrc',
]);

const files = await listRepositoryFiles('');
const findings = [...readmePerFolder(files), ...(await Promise.all(files.map(checkFile))).flat()];

for (const [rule, group] of Map.groupBy(findings, (finding) => finding.rule)) {
  console.log(`${rule}: ${group.length}`);
  for (const finding of group) {
    const where = finding.line === undefined ? finding.file : `${finding.file}:${finding.line}`;
    console.log(`  ${where}  ${finding.message}`);
  }
}

if (findings.length > 0) {
  process.exit(1);
}
console.log(`delivery is clean: ${files.length} files checked`);

/** Every file to check, as paths from the root with `/` separators. */
async function listRepositoryFiles(folder: string): Promise<string[]> {
  const entries = await readdir(path.join(ROOT, folder), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const relative = folder === '' ? entry.name : `${folder}/${entry.name}`;
      if (isSkipped(relative, entry.name, entry.isDirectory())) {
        return [];
      }
      return entry.isDirectory() ? listRepositoryFiles(relative) : [relative];
    }),
  );
  return nested.flat().sort();
}

function isSkipped(relative: string, name: string, isFolder: boolean): boolean {
  if (isFolder && SKIPPED_FOLDER_NAMES.has(name)) {
    return true;
  }
  const isLocalEnvironment = name.startsWith('.env.') && name !== '.env.example';
  return SKIPPED_PATHS.has(relative) || name === '.DS_Store' || isLocalEnvironment;
}

async function checkFile(file: string): Promise<Finding[]> {
  const content = await readFile(path.join(ROOT, file), 'utf8');
  // A NUL character only appears in binary files such as images, which hold no text to check.
  if (content.includes('\0')) {
    return [];
  }
  return FILE_RULES.flatMap((rule) => rule(file, content));
}
