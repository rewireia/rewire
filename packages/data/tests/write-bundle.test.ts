import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkBundle } from '../pipeline/check-bundle.ts';
import { ESCO_OCCUPATIONS, ILO_EXPOSURE, SOURCES } from '../pipeline/sources.ts';
import { writeBundle } from '../pipeline/write-bundle.ts';
import { BUNDLE_FILES, bundleManifestSchema, sha256Of } from '../src/index.ts';

import { sampleContents, useTemporaryDirectory } from './support/builders.ts';

const FIRST_DAY = '2026-01-15';
const LATER_DAY = '2026-03-02';

describe('writeBundle', () => {
  const directory = useTemporaryDirectory();

  async function readManifest() {
    const text = await readFile(path.join(directory(), BUNDLE_FILES.manifest), 'utf8');
    return bundleManifestSchema.parse(JSON.parse(text));
  }

  async function readAllFiles(): Promise<Map<string, Buffer>> {
    const names = (await readdir(directory())).toSorted();
    const bytes = await Promise.all(names.map((name) => readFile(path.join(directory(), name))));
    return new Map(names.map((name, position) => [name, bytes[position] ?? Buffer.alloc(0)]));
  }

  it('writes every bundle file with a manifest that records its digest and size', async () => {
    await writeBundle(directory(), sampleContents(), FIRST_DAY);
    const manifest = await readManifest();

    expect(manifest.files.map((entry) => entry.file)).toEqual([
      BUNDLE_FILES.exposure,
      BUNDLE_FILES.taskRationales,
      BUNDLE_FILES.classification('eu'),
      BUNDLE_FILES.classification('us'),
      BUNDLE_FILES.classification('uk'),
      BUNDLE_FILES.labour('eu'),
      BUNDLE_FILES.labour('us'),
      BUNDLE_FILES.labour('uk'),
    ]);
    for (const entry of manifest.files) {
      const bytes = await readFile(path.join(directory(), entry.file));
      expect(sha256Of(bytes)).toBe(entry.sha256);
      expect(bytes.byteLength).toBe(entry.bytes);
    }
  });

  it('records every source and the sources each file derives from', async () => {
    const manifest = await writeBundle(directory(), sampleContents(), FIRST_DAY);
    const sourcesOf = (file: string) =>
      manifest.files.find((entry) => entry.file === file)?.sources;

    expect(manifest.sources.map((source) => source.id)).toEqual(SOURCES.map((source) => source.id));
    expect(sourcesOf(BUNDLE_FILES.classification('us'))).toEqual([
      'onet-database',
      'esco-onet-crosswalk',
      'esco-occupations',
    ]);
    expect(sourcesOf(BUNDLE_FILES.labour('uk'))).toEqual([
      'ons-aps-employment',
      'ons-ashe-table-14',
    ]);
  });

  it('writes a bundle that the check accepts', async () => {
    const contents = sampleContents();
    await writeBundle(directory(), contents, FIRST_DAY);

    const bundle = await checkBundle(directory());

    expect(bundle.exposure).toEqual(contents.exposure);
  });

  it('writes the same bytes every time it is given the same contents', async () => {
    await writeBundle(directory(), sampleContents(), FIRST_DAY);
    const first = await readAllFiles();
    await writeBundle(directory(), sampleContents(), LATER_DAY);

    expect(await readAllFiles()).toEqual(first);
  });

  it('keeps the day a source was retrieved while its digest is unchanged', async () => {
    await writeBundle(directory(), sampleContents(), FIRST_DAY);

    const manifest = await writeBundle(directory(), sampleContents(), LATER_DAY);

    expect(new Set(manifest.sources.map((source) => source.retrievedOn))).toEqual(
      new Set([FIRST_DAY]),
    );
  });

  it('renews the day a source was retrieved when its digest changes', async () => {
    await writeBundle(directory(), sampleContents(), FIRST_DAY);
    const changed = sampleContents({ [ESCO_OCCUPATIONS.id]: sha256Of(Buffer.from('new pages')) });

    const manifest = await writeBundle(directory(), changed, LATER_DAY);
    const dayOf = (id: string) => manifest.sources.find((source) => source.id === id)?.retrievedOn;

    expect(dayOf(ESCO_OCCUPATIONS.id)).toBe(LATER_DAY);
    expect(dayOf(ILO_EXPOSURE.id)).toBe(FIRST_DAY);
  });

  it('writes nothing when the contents break their schema', async () => {
    const contents = sampleContents();
    const broken = {
      ...contents,
      exposure: { ...contents.exposure, majorGroups: [{ code: 'two', title: 'Professionals' }] },
    };

    await expect(writeBundle(directory(), broken, FIRST_DAY)).rejects.toThrow();
    expect(await readdir(directory())).toEqual([]);
  });

  it('fails when a source has no recorded digest', async () => {
    const contents = { ...sampleContents(), sourceDigests: new Map<string, string>() };

    await expect(writeBundle(directory(), contents, FIRST_DAY)).rejects.toThrow(
      `no digest was recorded for ${ILO_EXPOSURE.id}`,
    );
  });
});
