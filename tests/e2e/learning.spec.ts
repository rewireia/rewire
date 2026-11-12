import { expect, test, type APIRequestContext } from './support/test.ts';

const COURSE = 'ai-foundations';

test.beforeEach(async ({ context }) => {
  await context.route(/paypal\.com/, (route) => route.abort());
});

/** Buys a course through the API with the page's own session: PayPal is faked by the server. */
async function buyCourse(request: APIRequestContext, courseId: string): Promise<void> {
  const opened = await request.post('/api/checkout/orders', { data: { courseId, region: 'us' } });
  expect(opened.status()).toBe(201);
  const { orderId } = (await opened.json()) as { orderId: string };
  const captured = await request.post(`/api/checkout/orders/${orderId}/capture`, { data: {} });
  expect(((await captured.json()) as { status: string }).status).toBe('completed');
}

test('a learner studies a course, passes the quiz and anyone can verify the certificate', async ({
  page,
  browser,
}) => {
  // The learner has confirmed an occupation, so the practice uses its real tasks.
  await page.request.put('/api/session/profile', {
    data: {
      region: 'us',
      occupation: { code: '43-3051.00', title: 'Payroll Clerk', isco08: '4313' },
      timeByTask: {},
    },
  });
  await buyCourse(page.request, COURSE);
  await page.goto(`/learn/${COURSE}`);

  for (let lesson = 0; lesson < 3; lesson += 1) {
    await page.getByRole('button', { name: 'Mark as completed' }).click();
    await expect(page.getByText('You completed this lesson.')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await expect(page.getByRole('heading', { level: 2, name: /Try it on one task/ })).toBeVisible();
  await expect(page.getByText(/Verifying attendance/)).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  // The right answers, from the explanation of an attempt made through the API.
  const attempt = await page.request.post(`/api/learning/courses/${COURSE}/quiz`, {
    data: { answers: [0, 0, 0, 0, 0] },
  });
  const { questions } = (await attempt.json()) as { questions: { correctOption: number }[] };
  const groups = page.getByRole('group', { name: /^Question \d/ });
  await expect(groups).toHaveCount(questions.length);
  for (const [index, { correctOption }] of questions.entries()) {
    await groups.nth(index).getByRole('radio').nth(correctOption).check();
  }
  await page.getByRole('button', { name: 'Check my answers' }).click();
  await expect(page.getByText(/You passed/)).toBeVisible();

  await page.getByRole('textbox', { name: 'Your name' }).fill('Alex Example');
  await page.getByRole('button', { name: 'Claim your certificate' }).click();
  await expect(page).toHaveURL(/\/certificates\//);
  await expect(page.getByRole('heading', { name: 'Alex Example' })).toBeVisible();
  const address = page.url();

  // A stranger with no session verifies it at the same address.
  const stranger = await browser.newContext();
  const visitor = await stranger.newPage();
  await visitor.goto(address);
  await expect(visitor.getByRole('heading', { name: 'Alex Example' })).toBeVisible();
  await expect(visitor.getByText(/demonstration catalogue/)).toBeVisible();
  await expect(visitor.getByText(/can be verified at this address/)).toBeVisible();
  await stranger.close();
});
