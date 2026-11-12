import { loadDataBundle, type DataBundle, type Region } from '@rewire/data';
import { beforeAll, describe, expect, it } from 'vitest';

import { buildTitleIndex, createEngine, type Engine } from '../src/index.ts';
import { prefixCompletionsOf } from '../src/occupation/search.ts';

/** What people write, and the unit group the first result must lead to. */
const FIRST_RESULTS: readonly (readonly [Region, string, string])[] = [
  ['us', 'software developer', '2512'],
  ['us', 'payroll clerk', '4313'],
  ['us', 'registered nurse', '2221'],
  ['us', 'accountant', '2411'],
  ['uk', 'software developer', '2512'],
  ['uk', 'HGV driver', '8332'],
  ['uk', 'plumber', '7126'],
  ['eu', 'software developer', '2512'],
  ['eu', 'comptable', '2411'],
  ['eu', 'avvocato', '2611'],
];

/** A word being typed and a common word it must complete to, in each region. */
const COMPLETIONS: readonly (readonly [Region, string, string])[] = [
  ['us', 'con', 'consultant'],
  ['uk', 'con', 'consultant'],
  ['eu', 'con', 'consultant'],
  ['us', 'pro', 'programmer'],
  ['eu', 'pro', 'programmer'],
  ['eu', 'acc', 'accountant'],
];

describe('the engine over the shipped bundle', () => {
  let bundle: DataBundle;
  let engine: Engine;

  beforeAll(async () => {
    bundle = await loadDataBundle();
    engine = createEngine(bundle);
  });

  it.each(COMPLETIONS)('completes %s "%s" to "%s"', (region, prefix, word) => {
    const index = buildTitleIndex(bundle.classifications[region]);

    expect(prefixCompletionsOf(index, prefix)).toContain(word);
  });

  it.each(FIRST_RESULTS)('leads %s "%s" to unit group %s first', (region, query, isco08) => {
    const [first] = engine.searchOccupations(region, query);

    expect(first?.unitGroup?.isco08).toBe(isco08);
  });

  it('gives payroll clerks in the US their employment and median annual wage', () => {
    const labour = engine.occupationLabour('us', { occupationCode: '43-3051.00', isco08: '4313' });

    expect(labour.employment?.value).toBeGreaterThan(50_000);
    expect(labour.pay).toMatchObject({ currency: 'USD', measure: 'median-annual' });
  });

  it('gives programmers in the UK their employment and software developers in the EU theirs', () => {
    const uk = engine.occupationLabour('uk', { occupationCode: '2134', isco08: '2512' });
    const eu = engine.occupationLabour('eu', { occupationCode: '2512.4', isco08: '2512' });

    expect(uk.employment?.value).toBeGreaterThan(100_000);
    expect(eu.employment).toMatchObject({ level: 'isco-2-digit', groupCode: '25' });
    expect(eu.pay).toMatchObject({ level: 'isco-1-digit', groupCode: '2', currency: 'EUR' });
  });

  it('profiles software developers with their eight tasks, most exposed first', () => {
    const profile = engine.exposureProfile('2512');
    const scores = profile?.tasks.map((task) => task.score) ?? [];

    expect(profile?.gradient).toBe('gradient-3');
    expect(scores).toHaveLength(8);
    expect(scores).toEqual(scores.toSorted((a, b) => b - a));
  });
});
