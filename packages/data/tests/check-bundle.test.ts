import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkBundle } from '../pipeline/check-bundle.ts';
import { writeBundle } from '../pipeline/write-bundle.ts';
import {
  BUNDLE_FILES,
  BundleIntegrityError,
  bundleManifestSchema,
  type BundleManifest,
} from '../src/index.ts';

import { sampleContents, useTemporaryDirectory } from './support/builders.ts';

const DAY = '2026-01-15';

describe('checkBundle', () => {
  const directory = useTemporaryDirectory();

  it('accepts a whole bundle, even next to files that are not JSON', async () => {
    await writeBundle(directory(), sampleContents(), DAY);
    await writeFile(path.join(directory(), 'notes.txt'), 'kept by hand');

    await expect(checkBundle(directory())).resolves.toMatchObject({
      manifest: { formatVersion: 1 },
    });
  });

  it('rejects a JSON file in the folder that the manifest does not list', async () => {
    await writeBundle(directory(), sampleContents(), DAY);
    await writeFile(path.join(directory(), 'classification.fr.json'), '{}\n');

    await expect(checkBundle(directory())).rejects.toThrow(BundleIntegrityError);
    await expect(checkBundle(directory())).rejects.toThrow(
      'the bundle folder holds files its manifest leaves out: classification.fr.json',
    );
  });

  it('rejects a labour file about another region than its name says', async () => {
    const contents = sampleContents();
    await writeBundle(
      directory(),
      { ...contents, labour: { ...contents.labour, uk: { region: 'us' } } },
      DAY,
    );

    await expect(checkBundle(directory())).rejects.toThrow(
      'labour.uk.json is about another region',
    );
  });

  /** Writes a sample bundle, then rewrites its manifest. */
  async function bundleWithManifest(
    change: (manifest: BundleManifest) => BundleManifest,
  ): Promise<void> {
    await writeBundle(directory(), sampleContents(), DAY);
    const file = path.join(directory(), BUNDLE_FILES.manifest);
    const manifest = bundleManifestSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    await writeFile(file, JSON.stringify(change(manifest)));
  }

  it('rejects a manifest that leaves out one of the bundle files', async () => {
    const left = BUNDLE_FILES.taskRationales;
    await bundleWithManifest((manifest) => ({
      ...manifest,
      files: manifest.files.filter((entry) => entry.file !== left),
    }));

    await expect(checkBundle(directory())).rejects.toThrow(BundleIntegrityError);
    await expect(checkBundle(directory())).rejects.toThrow(
      `${left} is not listed in the bundle manifest`,
    );
  });

  it('rejects a manifest that lists a file the bundle does not have', async () => {
    await bundleWithManifest((manifest) => {
      const [first] = manifest.files;
      if (first === undefined) {
        throw new Error('the sample manifest lists no files');
      }
      return { ...manifest, files: [...manifest.files, { ...first, file: 'extra.json' }] };
    });

    await expect(checkBundle(directory())).rejects.toThrow(
      'the bundle manifest lists unknown files: extra.json',
    );
  });
});
