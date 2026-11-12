import type { Enrolment, Payment, RoadmapCourse, Wallet, WalletMovement } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import { planProgress, walletUse } from '../src/features/dashboard/gauge-readings.ts';
import { learningPath } from '../src/features/dashboard/learning-path.ts';
import { readingsFor } from '../src/features/dashboard/reading-picks.ts';
import { recentActivity, walletSplit } from '../src/features/dashboard/recent-activity.ts';

const course = (
  courseId: string,
  date: string,
  status: RoadmapCourse['status'] = 'selected',
): RoadmapCourse => ({
  courseId,
  title: courseId,
  date,
  hours: 2,
  price: { currency: 'USD', minorUnits: 1900 },
  status,
});

const enrolment = (courseId: string, certificateId: string | null): Enrolment => ({
  kind: 'hosted',
  courseId,
  title: courseId,
  stage: 'understand',
  provider: null,
  url: null,
  status: certificateId === null ? 'active' : 'completed',
  lessonsCompleted: 1,
  lessons: 3,
  quizPassed: certificateId !== null,
  startedAt: '2026-11-01T10:00:00.000Z',
  completedAt: null,
  certificateId,
});

const wallet = (funded: number, spent: number): Wallet => ({
  region: 'us',
  currency: 'USD',
  fundedMinor: funded,
  spentMinor: spent,
  availableMinor: funded - spent,
});

describe('the learning path', () => {
  it('shows the way still to take, without courses or dates, before any occupation', () => {
    const path = learningPath({
      hasOccupation: false,
      courses: [],
      enrolments: [],
      today: '2026-11-12',
    });
    expect(path.milestones.map((step) => [step.kind, step.state])).toEqual([
      ['report', 'next'],
      ['plan', 'later'],
      ['courses', 'later'],
      ['goal', 'later'],
    ]);
    expect(path.milestones.every((step) => step.date === null)).toBe(true);
    expect(path.todayAt).toBe(0);
  });

  it('lays the plan in date order, marks the next step and places today before it', () => {
    const path = learningPath({
      hasOccupation: true,
      courses: [course('b', '2027-02-01'), course('a', '2027-01-04', 'completed')],
      enrolments: [enrolment('a', 'RWR-1')],
      today: '2026-11-12',
    });
    expect(path.milestones.map((step) => [step.id, step.state])).toEqual([
      ['report', 'done'],
      ['plan', 'done'],
      ['course-a', 'done'],
      ['course-b', 'next'],
      ['goal', 'later'],
    ]);
    const first = path.milestones[2];
    expect(first?.kind === 'course' && first.certificateId).toBe('RWR-1');
    expect(path.todayAt).toBe(3);
  });

  it('keeps a refunded course on the way without counting it for the goal', () => {
    const path = learningPath({
      hasOccupation: true,
      courses: [course('a', '2027-01-04', 'completed'), course('b', '2027-02-01', 'revoked')],
      enrolments: [enrolment('a', 'RWR-9')],
      today: '2027-03-01',
    });
    const goal = path.milestones.at(-1);
    expect(path.milestones.map((step) => step.state)).toEqual([
      'done',
      'done',
      'done',
      'refunded',
      'done',
    ]);
    expect(goal?.kind === 'goal' && goal.certificateId).toBe('RWR-9');
    expect(path.todayAt).toBe(path.milestones.length);
  });

  it('puts today after a course whose day has passed', () => {
    const path = learningPath({
      hasOccupation: true,
      courses: [course('a', '2026-10-01', 'active'), course('b', '2027-02-01')],
      enrolments: [],
      today: '2026-11-12',
    });
    expect(path.milestones[2]?.state).toBe('next');
    expect(path.todayAt).toBe(3);
  });
});

describe('the gauges', () => {
  it('measures the plan over the courses still in it', () => {
    expect(planProgress([])).toBeNull();
    expect(planProgress([course('a', '2027-01-04', 'revoked')])).toBeNull();
    expect(
      planProgress([
        course('a', '2027-01-04', 'completed'),
        course('b', '2027-02-01', 'active'),
        course('c', '2027-03-01'),
        course('d', '2027-03-08', 'revoked'),
      ]),
    ).toEqual({ completed: 1, total: 3, percent: 33 });
  });

  it('measures the wallet only once money was added', () => {
    expect(walletUse(wallet(0, 0))).toBeNull();
    expect(walletUse(wallet(5000, 1900))).toBe(38);
    expect(walletUse(wallet(5000, 5000))).toBe(100);
  });

  it('splits the wallet into spent and left', () => {
    expect(walletSplit(wallet(0, 0))).toBeNull();
    expect(walletSplit(wallet(4000, 1000))).toEqual({ spent: 25, available: 75 });
  });
});

const payment = (orderId: string, overrides: Partial<Payment> = {}): Payment => ({
  orderId,
  courseId: orderId,
  courseTitle: `Course ${orderId}`,
  method: 'wallet',
  amount: { currency: 'USD', minorUnits: 1900 },
  status: 'completed',
  createdAt: '2026-11-10T09:00:00.000Z',
  paidAt: '2026-11-10T09:00:05.000Z',
  refundedAt: null,
  paypalReference: null,
  refundable: true,
  refund: 'none',
  ...overrides,
});

const movement = (
  id: string,
  kind: WalletMovement['kind'],
  amountMinor: number,
  occurredAt: string,
): WalletMovement => ({
  id,
  kind,
  currency: 'USD',
  amountMinor,
  status: 'completed',
  occurredAt,
  paypalReference: null,
  title: kind === 'top-up' ? null : 'Course',
});

describe('the recent activity', () => {
  it('lists payments, refunds and top-ups newest first, each once', () => {
    const entries = recentActivity(
      [
        payment('a'),
        payment('b', {
          status: 'refunded',
          createdAt: '2026-11-11T09:00:00.000Z',
          paidAt: '2026-11-11T09:00:05.000Z',
          refundedAt: '2026-11-12T08:00:00.000Z',
        }),
        payment('c', { status: 'failed', paidAt: null, createdAt: '2026-11-09T09:00:00.000Z' }),
      ],
      [
        movement('t1', 'top-up', 5000, '2026-11-09T12:00:00.000Z'),
        movement('p1', 'course-payment', -1900, '2026-11-10T09:00:05.000Z'),
      ],
      10,
    );
    expect(entries.map((entry) => [entry.id, entry.amountMinor, entry.outcome])).toEqual([
      ['refund-b', 1900, 'done'],
      ['payment-b', -1900, 'done'],
      ['payment-a', -1900, 'done'],
      ['top-up-t1', 5000, 'done'],
      ['payment-c', -1900, 'failed'],
    ]);
  });

  it('keeps only the newest entries', () => {
    const entries = recentActivity([payment('a'), payment('b')], [], 1);
    expect(entries).toHaveLength(1);
  });
});

describe('the readings for the region', () => {
  const reading = (id: string, scope: 'global' | 'eu' | 'us' | 'uk', year: number) => ({
    id,
    type: 'note' as const,
    level: 'introductory' as const,
    topic: 'jobs' as const,
    scope,
    title: id,
    source: 'Publisher',
    year,
    url: `https://example.org/${id}`,
    format: 'web' as const,
    language: 'en',
    minutes: 10,
    why: 'Why',
    checkedOn: '2026-11-01',
  });

  it('puts the region first, then the world, newest first, three at most', () => {
    const picked = readingsFor(
      [
        reading('g-old', 'global', 2023),
        reading('uk', 'uk', 2026),
        reading('us-old', 'us', 2024),
        reading('g-new', 'global', 2026),
        reading('us-new', 'us', 2026),
      ],
      'us',
    );
    expect(picked.map((item) => item.id)).toEqual(['us-new', 'us-old', 'g-new']);
  });
});
