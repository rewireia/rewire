import { z } from 'zod';

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

/** An official source the bundle was built from, with what its licence asks us to state. */
export const sourceRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().min(1),
  version: z.string().min(1),
  url: z.url(),
  licence: z.object({ name: z.string().min(1), url: z.url() }),
  /** The credit line to show wherever the data is used. */
  attribution: z.string().min(1),
  /** Notice the licence requires when the work is adapted, if any. */
  adaptationNotice: z.string().optional(),
  /** Day the source was downloaded, as `YYYY-MM-DD`. */
  retrievedOn: z.iso.date(),
  /** Digest of the downloaded bytes. */
  sha256: sha256Schema,
});

export type SourceRecord = z.infer<typeof sourceRecordSchema>;

export const bundleFileSchema = z.object({
  file: z.string().min(1),
  sha256: sha256Schema,
  bytes: z.number().int().positive(),
  /** Ids of the sources the file derives from. */
  sources: z.array(z.string().min(1)).min(1),
});

export type BundleFile = z.infer<typeof bundleFileSchema>;

export const bundleManifestSchema = z.object({
  /** Raised when the shape of a bundle file changes. */
  formatVersion: z.literal(1),
  files: z.array(bundleFileSchema).min(1),
  sources: z.array(sourceRecordSchema).min(1),
});

export type BundleManifest = z.infer<typeof bundleManifestSchema>;
