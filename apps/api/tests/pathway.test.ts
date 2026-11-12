import { findDemoCourse } from '@rewire/content';
import {
  exposureReportSchema,
  pathwaySchema,
  regionListSchema,
  type Pathway,
} from '@rewire/contracts';
import { measureBridgeCoverage } from '@rewire/data';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import {
  buyCourse,
  createTestApi,
  expectProblem,
  startOrder,
  type TestApi,
} from './support/test-api.ts';

let api: TestApi;
let learner: TestClient;

beforeEach(async () => {
  api = await createTestApi();
  learner = api.client();
});

afterEach(async () => {
  await api.close();
});

const pathwayOf = async (region: string, isco08 = '4313', client = learner) =>
  bodyOf(await client.get(`/api/regions/${region}/pathway?isco08=${isco08}`), 200, pathwaySchema);

const card = (pathway: Pathway, courseId: string) =>
  pathway.steps.flatMap((step) => step.courses).find((course) => course.id === courseId);

/** Occupations of the US classification that are read through each unit group. */
const OCCUPATION_OF: Readonly<Record<string, string>> = {
  '4313': '43-3051.00',
  '2512': '15-1252.00',
};

const saveProfile = (isco08: string, timeByTask: Record<string, string>) =>
  learner.put('/api/session/profile', {
    region: 'us',
    occupation: { code: OCCUPATION_OF[isco08] ?? '', title: 'My job', isco08 },
    timeByTask,
  });

describe('regions', () => {
  it('describe each region with its classification, measured on the bundle', async () => {
    const { regions } = await bodyOf(await learner.get('/api/regions'), 200, regionListSchema);
    expect(regions.map((region) => region.region)).toEqual(['eu', 'us', 'uk']);
    const coverage = measureBridgeCoverage(api.bundle);
    for (const region of regions) {
      const measured = coverage.find((entry) => entry.region === region.region);
      const { scheme, languages } = api.bundle.classifications[region.region];
      expect(region.classification).toMatchObject({
        name: scheme.name,
        version: scheme.version,
        publisher: scheme.publisher,
        languages,
        occupations: measured?.occupations,
        jobTitles: (measured?.occupations ?? 0) + (measured?.titles ?? 0),
      });
      expect(region.classification.scoredTitleShare).toBeGreaterThan(0.5);
    }
    expect(regions.find((region) => region.region === 'uk')?.currency).toBe('GBP');
  });
});

describe('the learning plan', () => {
  it('does not exist for an unknown region or an occupation without a score', async () => {
    await expectProblem(await learner.get('/api/regions/xx/pathway?isco08=4313'), 404, 'not_found');
    await expectProblem(await learner.get('/api/regions/us/pathway?isco08=0000'), 404, 'not_found');
    await expectProblem(
      await learner.get('/api/regions/us/pathway?isco08=43'),
      400,
      'invalid_input',
    );
  });

  it('has three steps, free courses first, then the paid ones for the major group', async () => {
    const pathway = await pathwayOf('us');
    expect(pathway).toMatchObject({ region: 'us', isco08: '4313' });
    expect(
      pathway.steps.map((step) => ({
        stage: step.stage,
        free: step.freeCourses.map((course) => course.id),
        paid: step.courses.map((course) => course.id),
      })),
    ).toEqual([
      {
        stage: 'understand',
        free: ['elements-of-ai-introduction', 'hp-life-ai-for-beginners', 'make-america-ai-ready'],
        paid: ['ai-foundations'],
      },
      { stage: 'apply', free: ['ai-fluency-framework-foundations'], paid: ['ai-for-office-work'] },
      { stage: 'strengthen', free: ['ethics-of-ai'], paid: ['checking-ai-work'] },
    ]);
  });

  it('offers the free courses of the region only', async () => {
    const free = (await pathwayOf('eu')).steps[0]?.freeCourses.map((course) => course.id);
    expect(free).toContain('merit-fundamentals-of-ai');
    expect(free).not.toContain('make-america-ai-ready');
  });

  it('prices each course in the currency of the region', async () => {
    expect(card(await pathwayOf('uk'), 'ai-foundations')?.price).toEqual({
      currency: 'GBP',
      minorUnits: findDemoCourse('ai-foundations')?.prices.GBP,
    });
  });

  it('lists the pay-later products whose range holds the price', async () => {
    const us = await pathwayOf('us');
    expect(card(us, 'ai-foundations')?.payLater).toEqual([{ country: 'US', product: 'Pay in 4' }]);
    expect(card(us, 'ai-for-office-work')?.payLater).toEqual([
      { country: 'US', product: 'Pay in 4' },
      { country: 'US', product: 'Pay Monthly' },
    ]);
    const uk = await pathwayOf('uk');
    expect(card(uk, 'ai-foundations')?.payLater).toEqual([]);
    expect(card(uk, 'ai-for-office-work')?.payLater).toEqual([
      { country: 'GB', product: 'Pay in 3' },
    ]);
  });

  it('focuses on the three most exposed tasks and, of the rest, the three least exposed', async () => {
    const report = await bodyOf(
      await learner.get('/api/unit-groups/4313'),
      200,
      exposureReportSchema,
    );
    const ids = report.tasks.map((task) => task.id);
    const { focus } = await pathwayOf('us');
    // Payroll clerks have five tasks: three are the most exposed and the other two the least.
    expect(ids).toHaveLength(5);
    expect(focus.mostExposed.map((task) => task.id)).toEqual(ids.slice(0, 3));
    expect(focus.leastExposed.map((task) => task.id)).toEqual(ids.slice(3).toReversed());
  });

  it('never shows the same task as both most and least exposed', async () => {
    const { focus } = await pathwayOf('us');
    const shown = [...focus.mostExposed, ...focus.leastExposed].map((task) => task.id);
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('leaves out of the focus the tasks the learner said they do not do', async () => {
    const report = await bodyOf(
      await learner.get('/api/unit-groups/4313'),
      200,
      exposureReportSchema,
    );
    const ids = report.tasks.map((task) => task.id);
    const top = ids[0] ?? '';
    await saveProfile('4313', { [top]: 'none' });
    const { focus } = await pathwayOf('us');
    expect(focus.mostExposed.map((task) => task.id)).toEqual(ids.slice(1, 4));
    expect(focus.leastExposed.map((task) => task.id)).not.toContain(top);
  });

  it('ignores the answers given for another occupation', async () => {
    const other = await bodyOf(
      await learner.get('/api/unit-groups/2512'),
      200,
      exposureReportSchema,
    );
    await saveProfile('2512', { [other.tasks[0]?.id ?? '']: 'none' });
    const report = await bodyOf(
      await learner.get('/api/unit-groups/4313'),
      200,
      exposureReportSchema,
    );
    const { focus } = await pathwayOf('us');
    expect(focus.mostExposed.map((task) => task.id)).toEqual(
      report.tasks.slice(0, 3).map((task) => task.id),
    );
  });
});

describe('where the learner stands with each course', () => {
  it('is none for a visitor', async () => {
    const pathway = await pathwayOf('us');
    const statuses = pathway.steps.flatMap((step) =>
      step.courses.map((course) => course.enrolment),
    );
    expect(new Set(statuses)).toEqual(new Set(['none']));
  });

  it('follows the payment and the course: pending, active, completed, and none after a refund', async () => {
    const pending = await startOrder(learner, 'ai-for-office-work');
    api.gateway.scriptCapture(pending.paypalOrderId, 'pending');
    await learner.post(`/api/checkout/orders/${pending.orderId}/capture`);
    const { orderId } = await buyCourse(learner, 'checking-ai-work');
    const course = findDemoCourse('ai-foundations');
    await buyCourse(learner, 'ai-foundations');
    for (const lesson of course?.lessons ?? []) {
      await learner.post(`/api/learning/courses/ai-foundations/lessons/${lesson.id}/complete`);
    }
    await learner.post('/api/learning/courses/ai-foundations/quiz', {
      answers: course?.quiz.questions.map((question) => question.correctOption),
    });

    let pathway = await pathwayOf('us');
    expect(card(pathway, 'ai-for-office-work')?.enrolment).toBe('payment-pending');
    expect(card(pathway, 'checking-ai-work')?.enrolment).toBe('active');
    expect(card(pathway, 'ai-foundations')?.enrolment).toBe('completed');

    await learner.post(`/api/payments/${orderId}/refund`);
    pathway = await pathwayOf('us');
    expect(card(pathway, 'checking-ai-work')?.enrolment).toBe('none');
  });
});
