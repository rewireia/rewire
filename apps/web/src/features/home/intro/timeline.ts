/**
 * The beats of the opening, in milliseconds: the mark draws itself and the name appears, the line
 * is typed from `typeStart` over about `typeTotal`, the square cursor blinks three times
 * (`blinks`, three blinks of 0.8 s), the photograph rises out of the dark over `reveal`, a short
 * `hold`, and the phrase fades away over `leave`, leaving the same photograph and title.
 */
export const INTRO_MS = {
  typeStart: 2100,
  typeTotal: 1300,
  blinks: 2400,
  reveal: 3000,
  hold: 900,
  leave: 1000,
} as const;

/** Letters are typed no faster than this, and no slower than the next. */
const FASTEST_LETTER = 35;
const SLOWEST_LETTER = 90;

export interface IntroBeats {
  /** Time between two typed letters. */
  readonly letter: number;
  /** When the last letter is typed and the cursor starts its blinks. */
  readonly typed: number;
  /** When the photograph starts to rise. */
  readonly reveal: number;
  /** When the opening starts to fade away. */
  readonly leave: number;
  /** When the page is left on its own. */
  readonly done: number;
}

/** The beats for a line of `length` letters, typed at an even pace. */
export function introBeats(length: number): IntroBeats {
  const letters = Math.max(1, Math.floor(length));
  const even = Math.round(INTRO_MS.typeTotal / letters);
  const letter = Math.min(SLOWEST_LETTER, Math.max(FASTEST_LETTER, even));
  const typed = INTRO_MS.typeStart + letter * letters;
  const reveal = typed + INTRO_MS.blinks;
  const leave = reveal + INTRO_MS.reveal + INTRO_MS.hold;
  return { letter, typed, reveal, leave, done: leave + INTRO_MS.leave };
}
