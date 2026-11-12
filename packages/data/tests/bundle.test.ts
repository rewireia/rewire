import { appendFile, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { writeBundle } from '../pipeline/write-bundle.ts';
import {
  BUNDLE_FILES,
  BundleIntegrityError,
  DEFAULT_BUNDLE_DIRECTORY,
  loadDataBundle,
  loadTaskRationales,
  sha256Of,
  type BundleManifest,
} from '../src/index.ts';

import { sampleContents, useTemporaryDirectory } from './support/builders.ts';

const DAY = '2026-01-15';

describe('sha256Of', () => {
  it('gives the hexadecimal SHA-256 digest of the bytes', () => {
    expect(sha256Of(Buffer.from('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('DEFAULT_BUNDLE_DIRECTORY', () => {
  it('is the absolute path of the bundle folder of the package', () => {
    expect(path.isAbsolute(DEFAULT_BUNDLE_DIRECTORY)).toBe(true);
    expect(path.basename(DEFAULT_BUNDLE_DIRECTORY)).toBe('bundle');
  });
});

describe('loadDataBundle', () => {
  const directory = useTemporaryDirectory();

  it('reads a whole bundle into memory', async () => {
    const contents = sampleContents();
    await writeBundle(directory(), contents, DAY);

    const bundle = await loadDataBundle(directory());

    expect(bundle.exposure).toEqual(contents.exposure);
    expect(bundle.classifications).toEqual(contents.classifications);
    expect(bundle.labour).toEqual(contents.labour);
    expect(bundle.manifest.formatVersion).toBe(1);
  });

  it('rejects a bundle whose files changed after the manifest was written', async () => {
    const tampered = [
      BUNDLE_FILES.exposure,
      BUNDLE_FILES.classification('eu'),
      BUNDLE_FILES.classification('us'),
      BUNDLE_FILES.classification('uk'),
      BUNDLE_FILES.labour('eu'),
      BUNDLE_FILES.labour('us'),
      BUNDLE_FILES.labour('uk'),
    ];
    for (const file of tampered) {
      await writeBundle(directory(), sampleContents(), DAY);
      await appendFile(path.join(directory(), file), ' ');

      await expect(loadDataBundle(directory())).rejects.toThrow(BundleIntegrityError);
      await expect(loadDataBundle(directory())).rejects.toThrow(`${file} does not match`);
    }
  });

  it('rejects a bundle whose manifest does not list one of its files', async () => {
    await writeBundle(directory(), sampleContents(), DAY);
    const unlisted = BUNDLE_FILES.classification('uk');
    await rewriteManifest(directory(), (manifest) => ({
      ...manifest,
      files: manifest.files.filter((entry) => entry.file !== unlisted),
    }));

    await expect(loadDataBundle(directory())).rejects.toThrow(BundleIntegrityError);
    await expect(loadDataBundle(directory())).rejects.toThrow(`${unlisted} is not listed`);
  });

  it('reports a listed file that is not on disk, keeping the error of the disk', async () => {
    await writeBundle(directory(), sampleContents(), DAY);
    const absent = BUNDLE_FILES.labour('us');
    await unlink(path.join(directory(), absent));

    const error: unknown = await loadDataBundle(directory()).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(BundleIntegrityError);
    expect(error).toMatchObject({
      message: `${absent} is listed in the bundle manifest but cannot be read`,
      cause: { code: 'ENOENT' },
    });
  });
});

describe('loadDataBundle, when the manifest cannot be trusted', () => {
  const directory = useTemporaryDirectory();
  const manifestFile = () => path.join(directory(), BUNDLE_FILES.manifest);

  async function rejection(): Promise<BundleIntegrityError> {
    const error: unknown = await loadDataBundle(directory()).then(
      () => undefined,
      (reason: unknown) => reason,
    );
    if (!(error instanceof BundleIntegrityError)) {
      throw new Error('expected a BundleIntegrityError', { cause: error });
    }
    return error;
  }

  it('reports a missing manifest, keeping the error of the disk', async () => {
    const error = await rejection();

    expect(error.message).toBe(`${BUNDLE_FILES.manifest} is missing or cannot be read`);
    expect(error.cause).toMatchObject({ code: 'ENOENT' });
  });

  it('reports a manifest that is not JSON, keeping the parse error', async () => {
    await writeBundle(directory(), sampleContents(), DAY);
    await writeFile(manifestFile(), '{ "formatVersion": 1, ');

    const error = await rejection();

    expect(error.message).toBe(`${BUNDLE_FILES.manifest} is not valid JSON`);
    expect(error.cause).toBeInstanceOf(SyntaxError);
  });

  it('reports a manifest that breaks its schema, keeping the schema error', async () => {
    await writeBundle(directory(), sampleContents(), DAY);
    await rewriteManifest(directory(), (manifest) => ({ ...manifest, files: [] }));

    const error = await rejection();

    expect(error.message).toBe(`${BUNDLE_FILES.manifest} does not match the manifest schema`);
    expect(error.cause).toBeInstanceOf(ZodError);
  });
});

describe('loadTaskRationales', () => {
  const directory = useTemporaryDirectory();

  it('reads the reasoning behind each task score', async () => {
    const contents = sampleContents();
    await writeBundle(directory(), contents, DAY);

    expect(await loadTaskRationales(directory())).toEqual(contents.rationales);
  });

  it('rejects rationales that changed after the manifest was written', async () => {
    await writeBundle(directory(), sampleContents(), DAY);
    await appendFile(path.join(directory(), BUNDLE_FILES.taskRationales), ' ');

    await expect(loadTaskRationales(directory())).rejects.toThrow(BundleIntegrityError);
  });
});

async function rewriteManifest(
  directory: string,
  change: (manifest: BundleManifest) => BundleManifest,
): Promise<void> {
  const file = path.join(directory, BUNDLE_FILES.manifest);
  const manifest = JSON.parse(await readFile(file, 'utf8')) as BundleManifest;
  await writeFile(file, JSON.stringify(change(manifest)));
}
