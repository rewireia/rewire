import { readdir } from 'node:fs/promises';

import {
  BUNDLE_FILES,
  BundleIntegrityError,
  exposureDatasetSchema,
  labourContextSchema,
  loadDataBundle,
  loadTaskRationales,
  regionalClassificationSchema,
  regionSchema,
  taskRationalesSchema,
  type DataBundle,
} from '../src/index.ts';

/**
 * Proves, without the network, that a bundle is whole: every file matches the digest in
 * the manifest and its schema, and nothing is in the folder that the manifest leaves out.
 */
export async function checkBundle(directory: string): Promise<DataBundle> {
  const bundle = await loadDataBundle(directory);
  exposureDatasetSchema.parse(bundle.exposure);
  for (const region of regionSchema.options) {
    regionalClassificationSchema.parse(bundle.classifications[region]);
    if (labourContextSchema.parse(bundle.labour[region]).region !== region) {
      throw new BundleIntegrityError(`${BUNDLE_FILES.labour(region)} is about another region`);
    }
  }
  taskRationalesSchema.parse(await loadTaskRationales(directory));

  // The loaders above have already read every expected file and checked it against its digest,
  // and they refuse one the manifest does not list, so only extra files are left to find.
  const listed = new Set(bundle.manifest.files.map((entry) => entry.file));
  const expected = new Set<string>([
    BUNDLE_FILES.exposure,
    BUNDLE_FILES.taskRationales,
    ...regionSchema.options.map(BUNDLE_FILES.classification),
    ...regionSchema.options.map(BUNDLE_FILES.labour),
  ]);
  const unknown = [...listed].filter((file) => !expected.has(file));
  if (unknown.length > 0) {
    throw new BundleIntegrityError(
      `the bundle manifest lists unknown files: ${unknown.join(', ')}`,
    );
  }
  const unlisted = (await readdir(directory)).filter(
    (file) => file.endsWith('.json') && file !== BUNDLE_FILES.manifest && !listed.has(file),
  );
  if (unlisted.length > 0) {
    throw new BundleIntegrityError(
      `the bundle folder holds files its manifest leaves out: ${unlisted.toSorted().join(', ')}`,
    );
  }
  return bundle;
}
