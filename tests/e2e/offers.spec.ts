import { expect, test, type Page } from './support/test.ts';

import { startBeacon } from './support/offers.ts';
import { signIn } from './support/sign-in.ts';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

test.beforeEach(async ({ context }) => {
  await context.route(/paypal\.com/, (route) => route.abort());
});

async function openAsLearner(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('rewire.opening', '1');
    localStorage.setItem(
      'rewire.preferences',
      JSON.stringify({ language: 'en', theme: 'light', region: 'us', regionChosen: true }),
    );
  });
  await signIn(page);
}

test('a beacon of the seller discounts the shop, the cart and is announced in the dashboard', async ({
  page,
  request,
}) => {
  // The seller starts a 25 % beacon from its own session, as from its panel.
  await startBeacon(request, { region: 'us', percent: 25, minutes: 120 });
  const offer: unknown = await (await page.request.get('/api/regions/us/offer')).json();
  expect(offer).toMatchObject({ offer: { region: 'us', percent: 25 } });

  await openAsLearner(page);
  await page.goto('/courses');

  // The band says how many courses, how much and until when.
  const band = page.getByRole('complementary', { name: 'Offer' });
  await expect(band).toContainText(/Sun School has ([\d,]+ courses|one course) at 25% off until /);

  // A card: the price paid now, the list price struck through, read aloud as one sentence.
  const browse = page.getByRole('region', { name: 'Browse the catalogue' });
  const card = browse.getByRole('article').first();
  await expect(card.getByText('Offer price')).toBeVisible();
  await expect(card.locator('del')).toBeVisible();
  await expect(card.getByText(/^Price with discount .+, before .+, until .+\.$/)).toBeAttached();

  // The band leads to the courses on offer, with the filter on in the address.
  await band.getByRole('link', { name: 'See the courses on offer' }).click();
  await expect(page).toHaveURL(/\/courses\?offer=1#courses-browse$/);
  const onOffer = browse.getByRole('button', { name: 'On offer' });
  await expect(onOffer).toHaveAttribute('aria-pressed', 'true');
  const shown = await browse.getByRole('article').count();
  await expect(browse.getByText('Offer price')).toHaveCount(shown);

  // In the cart: the line on offer, the saving and the warning that the server sets the amount.
  const title = (await card.getByRole('heading', { level: 3 }).textContent()) ?? '';
  await card.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/cart');
  const lines = page.getByRole('region', { name: /Your courses/ });
  await expect(lines.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(lines.locator('del')).toHaveCount(1);
  const summary = page.getByRole('complementary', { name: 'Order summary' });
  await expect(summary.getByText(/^You save .+ with the offer of Sun School$/)).toBeVisible();
  await expect(
    summary.getByText(/If the offer ends before you pay, the server charges the price in force/),
  ).toBeVisible();

  // The dashboard tells the learner, and its link opens the catalogue on the offers.
  await page.goto('/dashboard');
  const notice = page.getByRole('status').filter({ hasText: 'There are courses on offer' });
  await expect(notice).toContainText(/25% off .+ until /);
  await notice.getByRole('link', { name: 'See the offers' }).click();
  await expect(page).toHaveURL(/\/courses\?offer=1/);
  await expect(page.getByRole('button', { name: 'On offer' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // "Not now" puts this beacon's notice aside, also after reloading.
  await page.goto('/dashboard');
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Not now' }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('region', { name: 'My courses' })).toBeVisible();
  await expect(notice).toHaveCount(0);
});

test('with no beacon the shop shows no offer at all', async ({ page }) => {
  await openAsLearner(page);
  await page.goto('/courses?offer=1');
  const browse = page.getByRole('region', { name: 'Browse the catalogue' });
  await expect(browse.getByRole('article').first()).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Offer' })).toHaveCount(0);
  await expect(browse.getByRole('button', { name: 'On offer' })).toHaveCount(0);
  await expect(browse.getByText('Offer price')).toHaveCount(0);
});
