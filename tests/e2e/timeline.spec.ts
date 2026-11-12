import { expect, test, type Page } from './support/test.ts';

import { signIn } from './support/sign-in.ts';

const STUDY_PLAN = '/api/regions/us/study-plan?isco08=4313';

interface Booking {
  readonly startsOn: string;
  readonly endsOn: string;
}

interface Timeline {
  readonly plan: { readonly notBefore: Record<string, string>; bookedDays: Record<string, number> };
  readonly stages: readonly {
    readonly courses: readonly { readonly id: string; readonly booking: Booking | null }[];
  }[];
}

test.beforeEach(async ({ context }) => {
  // Nothing leaves the machine: PayPal's script is refused, as without a network.
  await context.route(/paypal\.com/, (route) => route.abort());
});

/** The plan as the server keeps it for this browser's session. */
async function readPlan(page: Page): Promise<Timeline> {
  const response = await page.request.get(STUDY_PLAN);
  return (await response.json()) as Timeline;
}

function bookingOf(timeline: Timeline, courseId: string): Booking | null {
  const course = timeline.stages.flatMap((stage) => stage.courses).find((c) => c.id === courseId);
  return course?.booking ?? null;
}

/** The learner's roadmap on the dashboard, for the payroll clerk's occupation. */
async function openRoadmap(page: Page): Promise<void> {
  await signIn(page);
  const profile = await page.request.put('/api/session/profile', {
    data: {
      region: 'us',
      occupation: { code: '43-3051.00', title: 'Payroll and Timekeeping Clerks', isco08: '4313' },
      timeByTask: {},
    },
  });
  expect(profile.ok()).toBe(true);
  await page.goto('/dashboard?tab=roadmap');
  await expect(
    page.getByRole('treegrid', { name: 'The courses of your plan in time' }),
  ).toBeVisible();
}

/** Waits for the next save of the plan, started by `action`. */
async function saved(page: Page, action: () => Promise<void>): Promise<void> {
  const answer = page.waitForResponse(
    (response) => response.url().includes('/study-plan') && response.request().method() === 'PUT',
  );
  await action();
  expect((await answer).ok()).toBe(true);
}

/** A day some weeks from today, as the server writes it and as a US date field is typed. */
function daysFromToday(days: number): { iso: string; typed: string } {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return {
    iso: `${date.getFullYear()}-${month}-${day}`,
    typed: `${month}${day}${date.getFullYear()}`,
  };
}

const daysTaken = ({ startsOn, endsOn }: Booking) =>
  Math.round((Date.parse(endsOn) - Date.parse(startsOn)) / 86_400_000) + 1;

test('the plan in time ends later or sooner as the hours a week change', async ({ page }) => {
  await openRoadmap(page);
  const section = page.getByRole('main');
  await expect(section.getByRole('treegrid')).toBeVisible();
  // The head of the roadmap states the pace and the end of the plan, as the server computes it.
  const head = page.getByRole('region', { name: 'My roadmap' });
  const finish = head.getByRole('definition').first();
  await expect(head.getByRole('term').first()).toHaveText('You finish on');
  await expect(head.getByText(/ · 4 h a week$/)).toBeVisible();
  const before = await finish.textContent();

  await saved(page, () => section.getByRole('radio', { name: '8 h' }).click());
  await expect(head.getByText(/ · 8 h a week$/)).toBeVisible();
  await expect(finish).not.toHaveText(before ?? '');
});

test('a course left out stays out after a reload, and "Reset" brings it back', async ({ page }) => {
  await openRoadmap(page);
  const section = page.getByRole('main');
  await section.getByRole('radio', { name: 'List' }).check();
  const course = section.getByRole('listitem', { name: 'AI for Beginners' });
  // The box changes when the server has saved the plan, so it is clicked, not unchecked.

  await saved(page, () => course.getByRole('checkbox', { name: 'In the plan' }).click());
  await expect(course).toContainText('Out of the plan');
  expect(bookingOf(await readPlan(page), 'hp-life-ai-for-beginners')).toBeNull();

  await page.reload();
  await expect(course.getByRole('checkbox', { name: 'In the plan' })).not.toBeChecked();
  await expect(course).toContainText('Out of the plan');

  await saved(page, () => section.getByRole('button', { name: 'Reset' }).click());
  await expect(course.getByRole('checkbox', { name: 'In the plan' })).toBeChecked();
  await expect(section.getByRole('button', { name: 'Reset' })).toBeHidden();
  expect(bookingOf(await readPlan(page), 'hp-life-ai-for-beginners')).not.toBeNull();
});

test('in the list, the keyboard alone moves a course and books days for another', async ({
  page,
}) => {
  await openRoadmap(page);
  const section = page.getByRole('main');
  await section.getByRole('radio', { name: 'List' }).check();

  // "Start no earlier than" on a paid course: typed as a US date, kept with Enter.
  const later = daysFromToday(60);
  const paid = section.getByRole('listitem', { name: /^AI foundations/ });
  await paid.getByLabel('Start no earlier than').focus();
  await saved(page, async () => {
    await page.keyboard.type(later.typed);
    await page.keyboard.press('Enter');
  });
  let timeline = await readPlan(page);
  expect(timeline.plan.notBefore['ai-foundations']).toBe(later.iso);
  expect(bookingOf(timeline, 'ai-foundations')?.startsOn).toBe(later.iso);
  // The course after it follows it.
  const next = bookingOf(timeline, 'ai-fluency-framework-foundations');
  expect((next?.startsOn ?? '') > (bookingOf(timeline, 'ai-foundations')?.endsOn ?? '')).toBe(true);

  // "Days booked" on a free course whose provider publishes no length, kept with Tab.
  const free = section.getByRole('listitem', { name: 'Introduction to AI' });
  await free.getByLabel('Days booked').focus();
  await saved(page, async () => {
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('10');
    await page.keyboard.press('Tab');
  });
  timeline = await readPlan(page);
  expect(timeline.plan.bookedDays['elements-of-ai-introduction']).toBe(10);
  const booked = bookingOf(timeline, 'elements-of-ai-introduction');
  expect(booked === null ? 0 : daysTaken(booked)).toBe(10);
  await expect(free.getByLabel('Days booked')).toHaveValue('10');
});

test('dragging a bar of the timeline moves the course, and the next one follows', async ({
  page,
}) => {
  await openRoadmap(page);
  const id = 'make-america-ai-ready';
  const bar = page.locator(`.b-gantt-task-wrap[data-task-id="${id}"]`);
  await bar.scrollIntoViewIfNeeded();
  const before = await readPlan(page);
  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;

  // Slowly, as a hand moves: the chart follows the pointer step by step.
  await saved(page, async () => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let step = 1; step <= 24; step += 1) {
      await page.mouse.move(x + step * 6, y);
    }
    await page.mouse.up();
  });

  const after = await readPlan(page);
  const moved = bookingOf(after, id);
  expect(after.plan.notBefore[id]).toBe(moved?.startsOn);
  expect((moved?.startsOn ?? '') > (bookingOf(before, id)?.startsOn ?? '')).toBe(true);
  const next = bookingOf(after, 'ai-foundations');
  expect((next?.startsOn ?? '') > (moved?.endsOn ?? '')).toBe(true);
});

test('the dashboard shows the plan in time of the learner’s occupation', async ({ page }) => {
  await signIn(page);
  const profile = await page.request.put('/api/session/profile', {
    data: {
      region: 'us',
      occupation: { code: '43-3051.00', title: 'Payroll and Timekeeping Clerks', isco08: '4313' },
      timeByTask: {},
    },
  });
  expect(profile.ok()).toBe(true);

  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'My roadmap', exact: true }).click();
  // The head of the roadmap states the end of the plan; the chart lies right under it.
  await expect(page.getByRole('region', { name: 'My roadmap' })).toContainText('You finish on');
  await expect(page.getByRole('treegrid')).toBeVisible();
  // Each module of the path can be picked, and its card says what can be done with it.
  const modules = page.getByRole('group', { name: 'The modules of your path' });
  await modules.getByRole('button').first().click();
  await expect(page.getByRole('article')).toBeVisible();
});
