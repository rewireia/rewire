import { describe, expect, it } from 'vitest';

import { addDays, dayOf, laterOf, readerDay } from '../src/modules/study-plan/calendar-day.ts';

describe('a calendar day', () => {
  it('is the day an instant falls on in UTC', () => {
    expect(dayOf(new Date('2026-11-11T23:59:59.999Z'))).toBe('2026-11-11');
    expect(dayOf(new Date('2026-11-12T00:00:00.000Z'))).toBe('2026-11-12');
  });

  it('moves across the end of a month and of a year', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2026-11-11', 0)).toBe('2026-11-11');
  });

  it('knows a leap year from one that is not', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2100-02-28', 1)).toBe('2100-03-01');
  });

  it('is not shifted by a change of clocks', () => {
    // 365 days over the two changes of a year, in whatever zone the tests run.
    expect(addDays('2026-01-01', 365)).toBe('2027-01-01');
  });

  it('compares as text', () => {
    expect(laterOf('2026-11-11', '2026-02-28')).toBe('2026-11-11');
    expect(laterOf('2026-02-28', '2026-11-11')).toBe('2026-11-11');
  });
});

describe("the reader's day", () => {
  it("is the server's when the reader says nothing", () => {
    expect(readerDay('2026-11-11', undefined)).toBe('2026-11-11');
  });

  it("is the reader's own within a day of the server's", () => {
    expect(readerDay('2026-11-11', '2026-11-10')).toBe('2026-11-10');
    expect(readerDay('2026-11-11', '2026-11-12')).toBe('2026-11-12');
    expect(readerDay('2026-12-31', '2027-01-01')).toBe('2027-01-01');
  });

  it("is the server's when the reader's is further than time zones reach", () => {
    expect(readerDay('2026-11-11', '2026-11-13')).toBe('2026-11-11');
    expect(readerDay('2026-11-11', '2026-11-09')).toBe('2026-11-11');
  });
});
