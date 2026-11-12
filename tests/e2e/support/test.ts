import { expect, test as base } from '@playwright/test';

/** Every test has its own empty server database; browser contexts inside it share Demo. */
export const test = base.extend<{ resetDemo: boolean }>({
  resetDemo: [
    async ({ request }, use) => {
      const response = await request.post('http://127.0.0.1:8290/test/reset');
      expect(response.status()).toBe(204);
      await use(true);
    },
    { auto: true },
  ],
});
export { expect };
export type { APIRequestContext, Page } from '@playwright/test';
