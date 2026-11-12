import { catalogueSnapshotSchema } from '@rewire/content';
import { describe, expect, it } from 'vitest';

import {
  cleanUrl,
  courseIdOf,
  hoursOf,
  languagesOf,
  levelOf,
  plainSummary,
  shortSummary,
  snapshotOf,
} from '../microsoft-learn-rules.ts';
import { topicsOf } from '../microsoft-learn-topics.ts';

/** A fixed sample of the catalogue answer, in its own shape. */
const SAMPLE = {
  learningPaths: [
    {
      uid: 'learn.wwl.get-started-with-copilot',
      type: 'learningPath',
      title: 'Get started with Microsoft 365 Copilot',
      summary: 'Learn what Copilot does in Word &amp; Excel. Practise with prompts. Then more.',
      url: 'https://learn.microsoft.com/en-us/training/paths/get-started-copilot/?WT.mc_id=api_CatalogApi',
      levels: ['beginner'],
      roles: ['business-user'],
      products: ['microsoft-365-copilot'],
      duration_in_minutes: 102,
      locale: 'en-us',
    },
    {
      uid: 'learn.wwl.get-started-with-copilot',
      type: 'learningPath',
      title: 'Get started with Microsoft 365 Copilot',
      summary: 'A duplicate of the same path.',
      url: 'https://learn.microsoft.com/en-us/training/paths/get-started-copilot/',
      levels: ['beginner'],
      roles: [],
      products: [],
      duration_in_minutes: 102,
      locale: 'en-us',
    },
  ],
  courses: [
    {
      uid: 'course.sc-200t00',
      type: 'course',
      title: 'Microsoft Security Operations Analyst',
      summary:
        '<p>Learn how to investigate threats with Microsoft Sentinel.</p>\n<h4 id="audience">Audience Profile</h4><p>Analysts.</p>',
      url: 'https://learn.microsoft.com/en-us/training/courses/sc-200t00/?WT.mc_id=api_CatalogApi',
      levels: ['intermediate', 'advanced'],
      roles: ['security-operations-analyst'],
      products: ['microsoft-sentinel', 'defender-xdr'],
      duration_in_hours: 32,
      locales: ['en', 'es', 'pt-br', 'zh-cn'],
    },
  ],
};

describe('the summary of a catalogue entry', () => {
  it('keeps the first paragraph as plain text', () => {
    expect(plainSummary(SAMPLE.courses[0]?.summary ?? '')).toBe(
      'Learn how to investigate threats with Microsoft Sentinel.',
    );
    expect(plainSummary('Word &amp; Excel&#39;s <b>tables</b>')).toBe("Word & Excel's tables");
  });

  it('keeps one or two sentences, and cuts a long one at a word', () => {
    expect(shortSummary('One. Two. Three.')).toBe('One. Two.');
    const long = `${'word '.repeat(120).trim()}.`;
    const cut = shortSummary(long);
    expect(cut.length).toBeLessThanOrEqual(400);
    expect(cut.endsWith('word…')).toBe(true);
  });
});

describe('the fields of a catalogue entry', () => {
  it('drops the tracking parameter of the address', () => {
    expect(
      cleanUrl('https://learn.microsoft.com/en-us/training/paths/x/?WT.mc_id=api_CatalogApi'),
    ).toBe('https://learn.microsoft.com/en-us/training/paths/x/');
  });

  it('makes a slug of the uid, shortened with a digest past eighty characters', () => {
    expect(courseIdOf('learn.wwl.get-started-with-copilot')).toBe(
      'mslearn-wwl-get-started-with-copilot',
    );
    const long = courseIdOf(`learn.wwl.${'very-long-name-'.repeat(8)}end`);
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long).toMatch(/^mslearn-[a-z0-9-]+-[0-9a-f]{8}$/);
    expect(courseIdOf(`learn.wwl.${'very-long-name-'.repeat(8)}end`)).toBe(long);
  });

  it('maps beginner to introductory and keeps the lowest level', () => {
    expect(levelOf(['beginner'])).toBe('introductory');
    expect(levelOf(['advanced', 'intermediate'])).toBe('intermediate');
    expect(levelOf([])).toBe('introductory');
  });

  it('states hours to one decimal, and none when the catalogue gives none', () => {
    expect(hoursOf({ duration_in_minutes: 102 })).toBe(1.7);
    expect(hoursOf({ duration_in_hours: 24 })).toBe(24);
    expect(hoursOf({})).toBeNull();
  });

  it('reads the languages as two letters', () => {
    expect(languagesOf({ locale: 'en-us' })).toEqual(['en']);
    expect(languagesOf({ locales: ['en', 'pt-br', 'pt-pt'] })).toEqual(['en', 'pt']);
  });
});

describe('the topics of a Microsoft Learn course', () => {
  it('weigh a word of the title over a product, and a product over a role', () => {
    expect(
      topicsOf({ title: 'Get started with Microsoft 365 Copilot', products: [], roles: [] }),
    ).toEqual(['ai-at-work']);
    expect(
      topicsOf({
        title: 'Microsoft Security Operations Analyst',
        products: ['microsoft-sentinel'],
        roles: ['security-operations-analyst', 'administrator'],
      }),
    ).toEqual(['cybersecurity', 'cloud']);
  });

  it('give at most three, and fall back on the cloud', () => {
    expect(
      topicsOf({
        title: 'Build AI agents with data in Power BI using Python',
        products: ['azure-openai', 'power-bi'],
        roles: ['developer'],
      }),
    ).toHaveLength(3);
    expect(topicsOf({ title: 'Something else', products: [], roles: [] })).toEqual(['cloud']);
  });
});

describe('the snapshot of the catalogue', () => {
  it('holds each course once, in id order, in its schema', () => {
    const snapshot = snapshotOf(SAMPLE, '2026-11-12');
    expect(catalogueSnapshotSchema.safeParse(snapshot).error).toBeUndefined();
    expect(snapshot).toMatchObject({
      provider: 'Microsoft Learn',
      capturedOn: '2026-11-12',
      providerAccess: 'free',
      regions: [],
    });
    expect(snapshot.courses.map((course) => course.id)).toEqual([
      'mslearn-sc-200t00',
      'mslearn-wwl-get-started-with-copilot',
    ]);
    expect(snapshot.courses[0]).toMatchObject({
      url: 'https://learn.microsoft.com/en-us/training/courses/sc-200t00/',
      level: 'intermediate',
      hours: 32,
      languages: ['en', 'es', 'pt', 'zh'],
      summaryEs: null,
    });
  });

  it('refuses an answer that is not the catalogue', () => {
    expect(() => snapshotOf({ learningPaths: 'none' }, '2026-11-12')).toThrow();
  });
});
