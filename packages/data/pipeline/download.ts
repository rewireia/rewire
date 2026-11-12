import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { sha256Of } from '../src/index.ts';

import type { ApiQuery, ApiSource, FileSource, PagedSource, SourceFile } from './sources.ts';

export interface DownloadOptions {
  /** Where downloaded files are kept between runs. */
  readonly cacheDirectory: string;
  /** Use the cache only and fail on anything that would need the network. */
  readonly offline: boolean;
  /** Sent as `User-Agent` when set; some publishers refuse the default of the runtime. */
  readonly userAgent: string | undefined;
}

/** A source could not be obtained, or what arrived is not what was pinned. */
export class DownloadError extends Error {
  override readonly name = 'DownloadError';
}

const REQUEST_TIMEOUT_MS = 120_000;
/** A publisher is asked for one page at a time, with this pause between two of them. */
const PAGE_PAUSE_MS = 2000;

/** Returns the bytes of a pinned file, from the cache when its digest still matches. */
export async function downloadFile(
  source: FileSource,
  file: SourceFile,
  options: DownloadOptions,
): Promise<Uint8Array> {
  const cached = path.join(options.cacheDirectory, source.id, file.name);
  const fromCache = await readIfPresent(cached);
  if (fromCache !== undefined && sha256Of(fromCache) === file.sha256) {
    return fromCache;
  }
  const bytes = await request(file.url, options);
  const digest = sha256Of(bytes);
  if (digest !== file.sha256) {
    throw new DownloadError(
      `${source.id}/${file.name} changed at its source: expected sha256 ${file.sha256}, got ${digest}. ` +
        'Review the new file and update pipeline/sources.ts.',
    );
  }
  await store(cached, bytes);
  return bytes;
}

export interface DownloadedPages {
  /** Every page, in order, as parsed JSON. */
  readonly pages: unknown[];
  /** Digest of each page, in order. */
  readonly digests: string[];
}

/** Returns every page of a collection, from the cache where a page is already there. */
export async function downloadPages(
  source: PagedSource,
  options: DownloadOptions,
): Promise<DownloadedPages> {
  const pages: unknown[] = [];
  const digests: string[] = [];
  const pageCount = Math.ceil(source.expectedTotal / source.pageSize);
  for (let page = 0; page < pageCount; page += 1) {
    const name = `page-${String(page).padStart(3, '0')}.json`;
    const cached = path.join(options.cacheDirectory, source.id, name);
    let bytes = await readIfPresent(cached);
    if (bytes === undefined) {
      bytes = await request(source.pageUrl(page), options);
      await store(cached, bytes);
      await sleep(PAGE_PAUSE_MS);
    }
    pages.push(JSON.parse(Buffer.from(bytes).toString('utf8')));
    digests.push(sha256Of(bytes));
  }
  return { pages, digests };
}

export interface DownloadedAnswer {
  readonly bytes: Uint8Array;
  readonly sha256: string;
}

/**
 * Returns the response to an API query, from the cache once it has been fetched. It is not
 * compared with a pin: the step that reads it checks its shape and size.
 */
export async function downloadQuery(
  source: ApiSource,
  query: ApiQuery,
  options: DownloadOptions,
): Promise<DownloadedAnswer> {
  const cached = path.join(options.cacheDirectory, source.id, query.name);
  let bytes = await readIfPresent(cached);
  if (bytes === undefined) {
    bytes = await request(query.url, options);
    await store(cached, bytes);
  }
  return { bytes, sha256: sha256Of(bytes) };
}

async function request(url: string, options: DownloadOptions): Promise<Uint8Array> {
  if (options.offline) {
    throw new DownloadError(`${url} is not in the cache and the build is offline`);
  }
  const headers = new Headers();
  if (options.userAgent !== undefined) {
    headers.set('User-Agent', options.userAgent);
  }
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    throw new DownloadError(`${url} responded with ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function readIfPresent(file: string): Promise<Uint8Array | undefined> {
  try {
    return await readFile(file);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

async function store(file: string, bytes: Uint8Array): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}
