import { describe, expect, it } from 'vitest';

import { parsePreferences } from '../src/app/preferences.ts';

describe('stored preferences', () => {
  it('keep valid values', () => {
    const stored = JSON.stringify({
      region: 'uk',
      journeyRole: 'business',
      regionChosen: true,
      language: 'es',
      theme: 'dark',
      occupation: { region: 'uk', code: '8211', title: 'HGV driver', isco08: '8332' },
      planView: 'list',
      exploreView: 'analyse',
    });
    expect(parsePreferences(stored)).toEqual({
      region: 'uk',
      journeyRole: 'business',
      regionChosen: true,
      language: 'es',
      theme: 'dark',
      occupation: { region: 'uk', code: '8211', title: 'HGV driver', isco08: '8332' },
      planView: 'list',
      exploreView: 'analyse',
    });
  });

  it('drop values that are no longer valid', () => {
    const stored = JSON.stringify({
      region: 'mars',
      journeyRole: 'admin',
      theme: 'neon',
      occupation: { isco08: 'abc' },
      taskView: 'chart',
      planView: 'table',
      exploreView: 'chart',
    });
    const preferences = parsePreferences(stored);
    expect(preferences.region).toBe('us');
    expect(preferences.journeyRole).toBe('learner');
    expect(preferences.regionChosen).toBe(false);
    expect(preferences.theme).toBe('dark');
    expect(preferences.occupation).toBeNull();
    expect(preferences).not.toHaveProperty('taskView');
    expect(preferences.planView).toBeNull();
    expect(preferences.exploreView).toBeNull();
  });

  it('tell a region the person chose from the default one', () => {
    expect(parsePreferences(JSON.stringify({ region: 'eu' })).regionChosen).toBe(false);
    expect(
      parsePreferences(JSON.stringify({ region: 'eu', regionChosen: true })).regionChosen,
    ).toBe(true);
    expect(parsePreferences(JSON.stringify({ regionChosen: true })).regionChosen).toBe(false);
    expect(parsePreferences(null).regionChosen).toBe(false);
  });

  it('fall back to the defaults on unreadable storage', () => {
    expect(parsePreferences('{not json').region).toBe('us');
    expect(parsePreferences(null).occupation).toBeNull();
  });
});
