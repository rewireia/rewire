import { librarySchema, type Library } from '@rewire/contracts';

import type { Request } from './request.ts';

/** The readings of the library, with why each may interest the reader in their language. */
export function libraryApi(request: Request) {
  return {
    library(language: 'en' | 'es', signal?: AbortSignal): Promise<Library> {
      const path = `/library?${new URLSearchParams({ language })}`;
      return request(path, librarySchema, { signal: signal ?? null });
    },
  };
}
