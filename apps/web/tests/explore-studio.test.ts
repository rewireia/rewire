import type { UnitGroupSummary } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import { guardStorage } from '../src/app/storage.ts';
import { defaultReport, fieldsOf } from '../src/features/explorer/studio/report.ts';
import {
  clearReport,
  loadReport,
  saveReport,
  type ReportStorage,
} from '../src/features/explorer/studio/report-store.ts';
import {
  majorGroupRows,
  occupationRows,
  studioDataOf,
} from '../src/features/explorer/studio/studio-data.ts';
import type { Messages } from '../src/i18n/use-messages.ts';
import { translate } from '../src/i18n/format.ts';

const t: Messages['t'] = (key, values) => translate('en', key, values);

const GROUPS: UnitGroupSummary[] = [
  {
    isco08: '4132',
    title: 'Data Entry Clerks',
    majorGroup: { code: '4', title: 'Clerical support workers' },
    meanScore: 0.7,
    gradient: 'gradient-4',
    tasks: 6,
  },
  {
    isco08: '1111',
    title: 'Legislators',
    majorGroup: { code: '1', title: 'Managers' },
    meanScore: 0.31,
    gradient: 'not-exposed',
    tasks: 7,
  },
  {
    isco08: '4311',
    title: 'Accounting and Bookkeeping Clerks',
    majorGroup: { code: '4', title: 'Clerical support workers' },
    meanScore: 0.64,
    gradient: 'gradient-3',
    tasks: 8,
  },
];

describe('the dashboard tables', () => {
  it('turn each occupation into a row with the explorer’s points and level names', () => {
    expect(occupationRows(GROUPS, t)[0]).toEqual({
      isco08: '4132',
      title: 'Data Entry Clerks',
      majorGroupCode: '4',
      exposure: 70,
      level: 'Very high',
      levelOrder: 6,
      highLevel: 1,
      tasks: 6,
    });
    expect(occupationRows(GROUPS, t)[1]).toMatchObject({ level: 'Not exposed', levelOrder: 1 });
  });

  it('derive each major group once, in code order, from the same list', () => {
    expect(majorGroupRows(GROUPS)).toEqual([
      { code: '1', majorGroup: '1 · Managers' },
      { code: '4', majorGroup: '4 · Clerical support workers' },
    ]);
  });
});

describe('the shipped dashboard', () => {
  it('names only fields its tables hold', () => {
    const data = studioDataOf(GROUPS, { t, language: 'en' });
    const known = new Set(
      data.sources.flatMap((source) =>
        'fields' in source ? source.fields.map((field) => `${source.id}.${field.id}`) : [],
      ),
    );
    const named = fieldsOf(defaultReport(t));
    expect(named.length).toBeGreaterThan(5);
    expect(named.filter((id) => !known.has(id))).toEqual([]);
  });

  it('places every widget it defines on each of its two pages, and nothing else', () => {
    const { pages } = defaultReport(t);
    expect(pages.map((page) => page.id)).toEqual(['overview', 'groups']);
    for (const page of pages) {
      expect(Object.keys(page.widgetLayout ?? {}).sort()).toEqual(
        Object.keys(page.widgets ?? {}).sort(),
      );
    }
  });

  it('is written in the language of the interface', () => {
    const spanish: Messages['t'] = (key, values) => translate('es', key, values);
    expect(JSON.stringify(defaultReport(spanish))).toContain('Ocupaciones puntuadas');
    expect(JSON.stringify(defaultReport(t))).toContain('Occupations scored');
  });
});

function memoryStorage(): ReportStorage & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  const storage = guardStorage({
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  });
  return { ...storage, items };
}

describe('the saved layout', () => {
  it('is saved, read back and forgotten, one per language', () => {
    const storage = memoryStorage();
    const report = defaultReport(t);
    expect(loadReport(storage, 'en')).toBeNull();
    expect(saveReport(storage, 'en', report)).toBe(true);
    expect(loadReport(storage, 'en')).toEqual(report);
    expect(loadReport(storage, 'es')).toBeNull();
    clearReport(storage, 'en');
    expect(loadReport(storage, 'en')).toBeNull();
  });

  it('ignores what is not a report', () => {
    const storage = memoryStorage();
    storage.items.set('rewire.explore.studio.v2.en', '{not json');
    expect(loadReport(storage, 'en')).toBeNull();
    storage.items.set('rewire.explore.studio.v2.en', JSON.stringify({ pages: [] }));
    expect(loadReport(storage, 'en')).toBeNull();
  });

  it('survives a browser that refuses storage', () => {
    const refusing: ReportStorage = guardStorage({
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    });
    expect(loadReport(refusing, 'en')).toBeNull();
    expect(saveReport(refusing, 'en', defaultReport(t))).toBe(false);
    expect(() => {
      clearReport(refusing, 'en');
    }).not.toThrow();
  });
});
