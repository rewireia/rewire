import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Workspace packages are read from their sources, as TypeScript and the dev server do.
  resolve: { conditions: ['rewire-source'] },
  ssr: { resolve: { conditions: ['rewire-source'] } },
  test: {
    include: [
      'packages/*/tests/**/*.test.ts',
      'apps/*/tests/**/*.test.ts',
      'tools/tests/**/*.test.ts',
    ],
    environment: 'node',
    restoreMocks: true,
    testTimeout: 15_000,
  },
});
