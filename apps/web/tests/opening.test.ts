import { describe, expect, it } from 'vitest';

import { guardStorage } from '../src/app/storage.ts';
import { claimOpening } from '../src/features/home/intro/once.ts';
import { INTRO_MS, introBeats } from '../src/features/home/intro/timeline.ts';

/** A session storage in memory, or one that refuses every write. */
function memoryStorage(refuse = false) {
  const values = new Map<string, string>();
  return guardStorage({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (refuse) {
        throw new Error('QuotaExceededError');
      }
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  });
}

describe('the beats of the opening', () => {
  it('types the line at an even pace and keeps every beat in order', () => {
    const beats = introBeats(34);
    expect(beats.letter).toBe(Math.round(INTRO_MS.typeTotal / 34));
    expect(beats.typed).toBe(INTRO_MS.typeStart + beats.letter * 34);
    expect(beats.reveal).toBe(beats.typed + INTRO_MS.blinks);
    expect(beats.leave).toBe(beats.reveal + INTRO_MS.reveal + INTRO_MS.hold);
    expect(beats.done).toBe(beats.leave + INTRO_MS.leave);
  });

  it('blinks the cursor three times of 0.8 s', () => {
    expect(INTRO_MS.blinks).toBe(3 * 800);
  });

  it('types a long line no faster than 35 ms a letter and a short one no slower than 90 ms', () => {
    expect(introBeats(400).letter).toBe(35);
    expect(introBeats(3).letter).toBe(90);
    expect(introBeats(0).typed).toBe(INTRO_MS.typeStart + 90);
  });
});

describe('the opening plays once', () => {
  it('plays at the home page the first time in a session, and never again', () => {
    const storage = memoryStorage();
    expect(claimOpening({ storage, reducedMotion: false }, true)).toBe(true);
    expect(claimOpening({ storage, reducedMotion: false }, true)).toBe(false);
  });

  it('does not play when the site opens at another page, nor later at home', () => {
    const storage = memoryStorage();
    expect(claimOpening({ storage, reducedMotion: false }, false)).toBe(false);
    expect(claimOpening({ storage, reducedMotion: false }, true)).toBe(false);
  });

  it('does not play when the person asks for less motion', () => {
    expect(claimOpening({ storage: memoryStorage(), reducedMotion: true }, true)).toBe(false);
  });

  it('does not play without storage, or when storage refuses to keep the visit', () => {
    expect(claimOpening({ storage: null, reducedMotion: false }, true)).toBe(false);
    expect(claimOpening({ storage: memoryStorage(true), reducedMotion: false }, true)).toBe(false);
  });
});
