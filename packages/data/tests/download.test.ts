import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DownloadError, downloadQuery } from '../pipeline/download.ts';
import { NOMIS_EMPLOYMENT } from '../pipeline/labour-sources.ts';
import { sha256Of } from '../src/index.ts';

import { useTemporaryDirectory } from './support/builders.ts';

const [QUERY] = NOMIS_EMPLOYMENT.queries;

describe('downloadQuery', () => {
  const directory = useTemporaryDirectory();
  const options = () => ({ cacheDirectory: directory(), offline: true, userAgent: undefined });

  it('serves a query from the cache once it has been fetched, with the digest of the response', async () => {
    const bytes = Buffer.from('"DATE_NAME"\n');
    await mkdir(path.join(directory(), NOMIS_EMPLOYMENT.id), { recursive: true });
    await writeFile(path.join(directory(), NOMIS_EMPLOYMENT.id, QUERY.name), bytes);

    const answer = await downloadQuery(NOMIS_EMPLOYMENT, QUERY, options());

    expect(Buffer.from(answer.bytes)).toEqual(bytes);
    expect(answer.sha256).toBe(sha256Of(bytes));
  });

  it('fails offline when the response is not in the cache', async () => {
    await expect(downloadQuery(NOMIS_EMPLOYMENT, QUERY, options())).rejects.toThrow(DownloadError);
  });
});
