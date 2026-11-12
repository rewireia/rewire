import { regionSchema } from '@rewire/data/schema';
import { describe, expect, it } from 'vitest';

import {
  DEMO_COURSES,
  FREE_COURSES,
  REGION_PROFILES,
  demoCourseSchema,
  demoCoursesFor,
  findDemoCourse,
  freeCourseSchema,
  freeCoursesFor,
  priceOf,
  regionProfileSchema,
  type DemoCourse,
  type LessonBlock,
} from '../src/index.ts';

const MIN_LESSON_WORDS = 120;
const MAX_LESSON_WORDS = 260;
const STAGES = ['understand', 'apply', 'strengthen'];

function wordsIn(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

function wordsInBlock(block: LessonBlock): number {
  return block.type === 'list'
    ? block.items.reduce((sum, item) => sum + wordsIn(item), 0)
    : wordsIn(block.text);
}

function demoCourseWithId(id: string): DemoCourse {
  const course = findDemoCourse(id);
  if (course === undefined) {
    throw new Error(`there is no demo course ${id}`);
  }
  return course;
}

function duplicatesIn(values: readonly string[]): string[] {
  return values.filter((value, position) => values.indexOf(value) !== position);
}

/** Every URL anywhere in the content, found by walking the objects. */
function urlsIn(value: unknown): string[] {
  if (typeof value === 'string') {
    return /^[a-z]+:\/\//i.test(value) ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(urlsIn);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(urlsIn);
  }
  return [];
}

describe('content schemas', () => {
  it.each(DEMO_COURSES.map((course) => [course.id, course] as const))(
    'demo course %s matches its schema',
    (_id, course) => {
      expect(() => demoCourseSchema.parse(course)).not.toThrow();
    },
  );

  it.each(FREE_COURSES.map((course) => [course.id, course] as const))(
    'free course %s matches its schema',
    (_id, course) => {
      expect(() => freeCourseSchema.parse(course)).not.toThrow();
    },
  );

  it.each(regionSchema.options)('the %s profile matches its schema and its region', (region) => {
    const profile = regionProfileSchema.parse(REGION_PROFILES[region]);
    expect(profile.region).toBe(region);
  });
});

describe('identifiers', () => {
  it('are unique across demo and free courses', () => {
    const ids = [...DEMO_COURSES, ...FREE_COURSES].map((course) => course.id);
    expect(duplicatesIn(ids)).toEqual([]);
  });

  it.each(DEMO_COURSES.map((course) => [course.id, course] as const))(
    'are unique among the lessons and the questions of %s',
    (_id, course) => {
      expect(duplicatesIn(course.lessons.map((lesson) => lesson.id))).toEqual([]);
      expect(duplicatesIn(course.quiz.questions.map((question) => question.id))).toEqual([]);
    },
  );
});

describe('pay-later offers', () => {
  const offers = Object.values(REGION_PROFILES).flatMap((profile) =>
    profile.payLater.map((offer) => ({ profile, offer })),
  );

  it.each(
    offers.map(({ profile, offer }) => [offer.country, offer.product, profile, offer] as const),
  )(
    '%s %s has one currency, the region’s, and a minimum below its maximum',
    (_country, _product, profile, offer) => {
      expect(offer.minimum.currency).toBe(offer.maximum.currency);
      expect(offer.minimum.currency).toBe(profile.currency);
      expect(offer.minimum.minorUnits).toBeLessThanOrEqual(offer.maximum.minorUnits);
    },
  );
  it.each(offers.map(({ offer }) => [offer.country, offer.product, offer] as const))(
    '%s %s names the PayPal page its limits were read from, and the day',
    (_country, _product, offer) => {
      expect(offer.source.url).toBe('https://developer.paypal.com/pay-later/overview');
      expect(offer.checkedOn).toBe('2026-11-11');
    },
  );
});

describe('demo course editorial rules', () => {
  it.each(DEMO_COURSES.map((course) => [course.id, course] as const))(
    'every lesson of %s is between 120 and 260 words long',
    (_id, course) => {
      for (const lesson of course.lessons) {
        const words = lesson.blocks.reduce((sum, block) => sum + wordsInBlock(block), 0);
        expect(words, lesson.id).toBeGreaterThanOrEqual(MIN_LESSON_WORDS);
        expect(words, lesson.id).toBeLessThanOrEqual(MAX_LESSON_WORDS);
      }
    },
  );

  it.each(DEMO_COURSES.map((course) => [course.id, course] as const))(
    'the right answer of %s is not always the longest option',
    (_id, course) => {
      const longestIsWrong = course.quiz.questions.some((question) => {
        const lengths = question.options.map((option) => option.length);
        return lengths.indexOf(Math.max(...lengths)) !== question.correctOption;
      });
      expect(longestIsWrong).toBe(true);
    },
  );

  it.each(DEMO_COURSES.map((course) => [course.id, course] as const))(
    'the right answers of %s are not all in the same position',
    (_id, course) => {
      const positions = new Set(course.quiz.questions.map((question) => question.correctOption));
      expect(positions.size).toBeGreaterThan(1);
    },
  );

  it.each(DEMO_COURSES.map((course) => [course.id, course] as const))(
    'every lesson of %s has a key point to remember',
    (_id, course) => {
      for (const lesson of course.lessons) {
        expect(
          lesson.blocks.some((block) => block.type === 'key-point'),
          lesson.id,
        ).toBe(true);
      }
    },
  );
});

describe('links', () => {
  it('all use https', () => {
    const urls = urlsIn([REGION_PROFILES, DEMO_COURSES, FREE_COURSES]);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((url) => !url.startsWith('https://'))).toEqual([]);
  });
});

describe('findDemoCourse', () => {
  it('finds a course by its id', () => {
    expect(findDemoCourse('checking-ai-work')?.stage).toBe('strengthen');
  });

  it('returns undefined for an unknown id', () => {
    expect(findDemoCourse('no-such-course')).toBeUndefined();
  });
});

describe('priceOf', () => {
  const course = demoCourseWithId('ai-foundations');

  it.each([
    ['USD', 1900],
    ['GBP', 1500],
    ['EUR', 1800],
  ] as const)('gives the %s price in minor units', (currency, minorUnits) => {
    expect(priceOf(course, currency)).toEqual({ currency, minorUnits });
  });
});

describe('demoCoursesFor', () => {
  it('gives the courses for the group and those for every job, in stage order', () => {
    expect(demoCoursesFor('4').map((course) => course.id)).toEqual([
      'ai-foundations',
      'ai-for-office-work',
      'checking-ai-work',
    ]);
  });

  it('covers every ISCO-08 major group with one course of each stage', () => {
    for (const group of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      expect(
        demoCoursesFor(group).map((course) => course.stage),
        group,
      ).toEqual(STAGES);
    }
  });

  it('gives only the courses for every job to a group nobody wrote for', () => {
    expect(demoCoursesFor('0').map((course) => course.id)).toEqual([
      'ai-foundations',
      'checking-ai-work',
    ]);
  });
});

describe('freeCoursesFor', () => {
  it.each(regionSchema.options)('gives the open courses and those of %s only', (region) => {
    const courses = freeCoursesFor(region);
    expect(courses.some((course) => course.regions.includes(region))).toBe(true);
    expect(courses.filter((course) => course.regions.length === 0).length).toBe(
      FREE_COURSES.filter((course) => course.regions.length === 0).length,
    );
    expect(
      courses.every((course) => course.regions.length === 0 || course.regions.includes(region)),
    ).toBe(true);
  });
});
