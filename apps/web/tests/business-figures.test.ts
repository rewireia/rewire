import type { MarketCourse, MarketSale } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import { typedPrice } from '../src/features/marketplace/business-columns.tsx';
import {
  bestSellers,
  choicesOf,
  filterCatalogue,
  NO_FILTERS,
  salesByDay,
  totalsInOrder,
} from '../src/features/marketplace/business-figures.ts';

const sale = (overrides: Partial<MarketSale>): MarketSale => ({
  id: 'order',
  orderId: 'order',
  courseId: 'course-a',
  title: 'Course A',
  provider: 'Provider A',
  kind: 'listed',
  method: 'paypal',
  amount: { currency: 'USD', minorUnits: 1000 },
  refundedMinor: 0,
  status: 'completed',
  createdAt: '2026-11-10T09:00:00.000Z',
  paidAt: '2026-11-10T09:01:00.000Z',
  refundedAt: null,
  paypalReference: 'CAPTURE',
  ...overrides,
});

const course = (overrides: Partial<MarketCourse>): MarketCourse => ({
  courseId: 'course-a',
  region: 'us',
  title: 'Course A',
  currency: 'USD',
  kind: 'listed',
  provider: 'Provider A',
  languages: ['en'],
  hours: 2,
  priceMinor: 1900,
  published: true,
  offer: null,
  ...overrides,
});

describe('the seller figures', () => {
  it('sums each day of one currency: what was kept, and what went back', () => {
    const days = salesByDay(
      [
        sale({ id: '1', createdAt: '2026-11-11T08:00:00.000Z' }),
        sale({ id: '2', refundedMinor: 300 }),
        sale({ id: '3', status: 'refunded', refundedMinor: 1000 }),
        sale({ id: '4', status: 'pending' }),
        sale({ id: '5', amount: { currency: 'EUR', minorUnits: 900 } }),
      ],
      'USD',
    );
    expect(days).toEqual([
      { day: '2026-11-10', keptMinor: 700, refundedMinor: 1300 },
      { day: '2026-11-11', keptMinor: 1000, refundedMinor: 0 },
    ]);
  });

  it('ranks the best sellers by paid sales only', () => {
    const top = bestSellers([
      sale({ id: '1', courseId: 'b', title: 'B' }),
      sale({ id: '2', courseId: 'b', title: 'B' }),
      sale({ id: '3', courseId: 'a', title: 'A' }),
      sale({ id: '4', courseId: 'c', title: 'C', status: 'refunded' }),
    ]);
    expect(top.map((entry) => [entry.courseId, entry.sold])).toEqual([
      ['b', 2],
      ['a', 1],
    ]);
  });

  it('shows the region’s currency first', () => {
    const total = { netMinor: 0, reviewMinor: 0, refundedMinor: 0, sold: 0, refunds: 0 };
    const totals = [
      { ...total, currency: 'EUR' as const, averageMinor: null },
      { ...total, currency: 'USD' as const, averageMinor: null },
    ];
    expect(totalsInOrder(totals, 'USD').map((entry) => entry.currency)).toEqual(['USD', 'EUR']);
  });
});

describe('the catalogue filters', () => {
  const courses = [
    course({ courseId: 'a', provider: 'Zeta', languages: ['en', 'es'] }),
    course({ courseId: 'b', provider: 'Alpha', kind: 'hosted', published: false }),
  ];

  it('offers each provider and language once, sorted', () => {
    expect(choicesOf(courses, (entry) => [entry.provider])).toEqual(['Alpha', 'Zeta']);
    expect(choicesOf(courses, (entry) => entry.languages)).toEqual(['en', 'es']);
  });

  it('keeps the courses that match every filter', () => {
    expect(filterCatalogue(courses, NO_FILTERS)).toHaveLength(2);
    expect(filterCatalogue(courses, { ...NO_FILTERS, language: 'es' })).toEqual([courses[0]]);
    expect(filterCatalogue(courses, { ...NO_FILTERS, state: 'withdrawn' })).toEqual([courses[1]]);
    expect(filterCatalogue(courses, { ...NO_FILTERS, origin: 'own' }, new Set(['b']))).toEqual([
      courses[1],
    ]);
    expect(filterCatalogue(courses, { ...NO_FILTERS, kind: 'hosted', provider: 'Zeta' })).toEqual(
      [],
    );
  });
});

describe('a price typed in a cell', () => {
  it('is kept in minor units between 1 and 1,000', () => {
    expect(typedPrice('42.5')).toBe(4250);
    expect(typedPrice(1)).toBe(100);
    expect(typedPrice('0.5')).toBeNull();
    expect(typedPrice('1000.01')).toBeNull();
    expect(typedPrice('')).toBeNull();
    expect(typedPrice('abc')).toBeNull();
  });
});
