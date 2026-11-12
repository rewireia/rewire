import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Region, RegionalClassification } from './schema/classification.ts';
import type { ExposureDataset, TaskRationales } from './schema/exposure.ts';
import type { LabourContext } from './schema/labour.ts';
import { bundleManifestSchema, type BundleManifest } from './schema/manifest.ts';

/** Names of the files that make up the bundle. */
export const BUNDLE_FILES = {
  manifest: 'manifest.json',
  exposure: 'exposure.json',
  taskRationales: 'exposure-rationales.json',
  classification: (region: Region) => `classification.${region}.json`,
  labour: (region: Region) => `labour.${region}.json`,
} as const;

/** The bundle shipped with this package, next to `src` and `dist`. */
export const DEFAULT_BUNDLE_DIRECTORY = fileURLToPath(new URL('../bundle/', import.meta.url));

/** Everything the engine needs, read once at start-up and kept in memory. */
export interface DataBundle {
  readonly manifest: BundleManifest;
  readonly exposure: ExposureDataset;
  readonly classifications: Readonly<Record<Region, RegionalClassification>>;
  /** Employment and pay by occupation, from the official statistics of each region. */
  readonly labour: Readonly<Record<Region, LabourContext>>;
}

/**
 * The manifest cannot be read or does not match its schema, or a bundle file is missing
 * from it, cannot be read or does not match its recorded digest.
 */
export class BundleIntegrityError extends Error {
  override readonly name = 'BundleIntegrityError';
}

export function sha256Of(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Reads the bundle and checks every file against the digest in its manifest.
 *
 * The files are trusted to match their schemas because the pipeline validated them when
 * it wrote the manifest; the digest proves they have not changed since.
 */
export async function loadDataBundle(directory = DEFAULT_BUNDLE_DIRECTORY): Promise<DataBundle> {
  const manifest = await readManifest(directory);
  const read = <T>(file: string) => readVerified<T>(directory, manifest, file);
  const [exposure, eu, us, uk, euLabour, usLabour, ukLabour] = await Promise.all([
    read<ExposureDataset>(BUNDLE_FILES.exposure),
    read<RegionalClassification>(BUNDLE_FILES.classification('eu')),
    read<RegionalClassification>(BUNDLE_FILES.classification('us')),
    read<RegionalClassification>(BUNDLE_FILES.classification('uk')),
    read<LabourContext>(BUNDLE_FILES.labour('eu')),
    read<LabourContext>(BUNDLE_FILES.labour('us')),
    read<LabourContext>(BUNDLE_FILES.labour('uk')),
  ]);
  return {
    manifest,
    exposure,
    classifications: { eu, us, uk },
    labour: { eu: euLabour, us: usLabour, uk: ukLabour },
  };
}

/** The model reasoning behind each task score. Large, so it is read only when asked for. */
export async function loadTaskRationales(
  directory = DEFAULT_BUNDLE_DIRECTORY,
): Promise<TaskRationales> {
  const manifest = await readManifest(directory);
  return readVerified<TaskRationales>(directory, manifest, BUNDLE_FILES.taskRationales);
}

async function readManifest(directory: string): Promise<BundleManifest> {
  const file = BUNDLE_FILES.manifest;
  let text: string;
  try {
    text = await readFile(path.join(directory, file), 'utf8');
  } catch (cause) {
    throw new BundleIntegrityError(`${file} is missing or cannot be read`, { cause });
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (cause) {
    throw new BundleIntegrityError(`${file} is not valid JSON`, { cause });
  }
  const manifest = bundleManifestSchema.safeParse(json);
  if (!manifest.success) {
    throw new BundleIntegrityError(`${file} does not match the manifest schema`, {
      cause: manifest.error,
    });
  }
  return manifest.data;
}

async function readVerified<T>(
  directory: string,
  manifest: BundleManifest,
  file: string,
): Promise<T> {
  const entry = manifest.files.find((candidate) => candidate.file === file);
  if (entry === undefined) {
    throw new BundleIntegrityError(`${file} is not listed in the bundle manifest`);
  }
  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(directory, file));
  } catch (cause) {
    throw new BundleIntegrityError(`${file} is listed in the bundle manifest but cannot be read`, {
      cause,
    });
  }
  if (sha256Of(bytes) !== entry.sha256) {
    throw new BundleIntegrityError(`${file} does not match the digest in the bundle manifest`);
  }
  // Safe by construction: see the note on loadDataBundle.
  return JSON.parse(bytes.toString('utf8')) as T;
}
