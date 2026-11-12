import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  BUNDLE_FILES,
  bundleManifestSchema,
  exposureDatasetSchema,
  labourContextSchema,
  regionalClassificationSchema,
  sha256Of,
  taskRationalesSchema,
  type BundleFile,
  type BundleManifest,
  type SourceRecord,
} from '../src/index.ts';

import type { BundleContents } from './assemble.ts';
import {
  BLS_OEWS,
  EUROSTAT_EARNINGS,
  EUROSTAT_EMPLOYMENT,
  NOMIS_EMPLOYMENT,
  ONS_EARNINGS,
} from './labour-sources.ts';
import {
  ESCO_OCCUPATIONS,
  ESCO_ONET_CROSSWALK,
  ILO_EXPOSURE,
  ONET_DATABASE,
  ONS_CODING_INDEX,
  SOURCES,
  type Source,
} from './sources.ts';

/**
 * Validates the contents against their schemas and writes the bundle with its manifest.
 *
 * The same sources always give the same files: nothing in them depends on when the build
 * ran. The day a source was retrieved is kept from the previous manifest while its digest
 * is unchanged.
 */
export async function writeBundle(
  directory: string,
  contents: BundleContents,
  today: string,
): Promise<BundleManifest> {
  const { eu, us, uk } = contents.classifications;
  const outputs = [
    output(BUNDLE_FILES.exposure, exposureDatasetSchema.parse(contents.exposure), [ILO_EXPOSURE]),
    output(BUNDLE_FILES.taskRationales, taskRationalesSchema.parse(contents.rationales), [
      ILO_EXPOSURE,
    ]),
    output(BUNDLE_FILES.classification('eu'), regionalClassificationSchema.parse(eu), [
      ESCO_OCCUPATIONS,
    ]),
    output(BUNDLE_FILES.classification('us'), regionalClassificationSchema.parse(us), [
      ONET_DATABASE,
      ESCO_ONET_CROSSWALK,
      ESCO_OCCUPATIONS,
    ]),
    output(BUNDLE_FILES.classification('uk'), regionalClassificationSchema.parse(uk), [
      ONS_CODING_INDEX,
    ]),
    output(BUNDLE_FILES.labour('eu'), labourContextSchema.parse(contents.labour.eu), [
      EUROSTAT_EMPLOYMENT,
      EUROSTAT_EARNINGS,
    ]),
    output(BUNDLE_FILES.labour('us'), labourContextSchema.parse(contents.labour.us), [BLS_OEWS]),
    output(BUNDLE_FILES.labour('uk'), labourContextSchema.parse(contents.labour.uk), [
      NOMIS_EMPLOYMENT,
      ONS_EARNINGS,
    ]),
  ];

  const previous = await readPreviousManifest(directory);
  const manifest: BundleManifest = {
    formatVersion: 1,
    files: outputs.map(({ entry }) => entry),
    sources: SOURCES.map((source) => sourceRecord(source, contents, previous, today)),
  };

  await mkdir(directory, { recursive: true });
  await Promise.all(
    outputs.map(({ entry, bytes }) => writeFile(path.join(directory, entry.file), bytes)),
  );
  // The manifest goes last: if writing stops halfway, there is either no manifest or one whose
  // digests the new files do not match, so loading fails instead of mixing two builds.
  await writeFile(
    path.join(directory, BUNDLE_FILES.manifest),
    `${JSON.stringify(bundleManifestSchema.parse(manifest), null, 2)}\n`,
  );
  return manifest;
}

function output(
  file: string,
  value: unknown,
  sources: readonly Source[],
): { entry: BundleFile; bytes: Buffer } {
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`);
  return {
    entry: {
      file,
      sha256: sha256Of(bytes),
      bytes: bytes.byteLength,
      sources: sources.map((source) => source.id),
    },
    bytes,
  };
}

function sourceRecord(
  source: Source,
  contents: BundleContents,
  previous: BundleManifest | undefined,
  today: string,
): SourceRecord {
  const sha256 = contents.sourceDigests.get(source.id);
  if (sha256 === undefined) {
    throw new Error(`no digest was recorded for ${source.id}`);
  }
  const before = previous?.sources.find((record) => record.id === source.id);
  return {
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    version: source.version,
    url: source.url,
    licence: source.licence,
    attribution: source.attribution,
    ...(source.adaptationNotice === undefined ? {} : { adaptationNotice: source.adaptationNotice }),
    retrievedOn: before?.sha256 === sha256 ? before.retrievedOn : today,
    sha256,
  };
}

async function readPreviousManifest(directory: string): Promise<BundleManifest | undefined> {
  try {
    const text = await readFile(path.join(directory, BUNDLE_FILES.manifest), 'utf8');
    return bundleManifestSchema.parse(JSON.parse(text));
  } catch {
    // No manifest yet, or one from an older format: every source counts as retrieved today.
    return undefined;
  }
}
