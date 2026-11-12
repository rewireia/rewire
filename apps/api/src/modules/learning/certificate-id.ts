import { randomInt } from 'node:crypto';

/**
 * Letters and digits that cannot be mistaken for one another when an id is read aloud or
 * typed from paper: no 0 or O, and no 1, I or L.
 */
export const CERTIFICATE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const PREFIX = 'RWR';
const GROUPS = 2;
const GROUP_LENGTH = 4;

/** Picks a position in the alphabet. Passed in so tests can make ids collide on purpose. */
export type RandomIndex = (size: number) => number;

/**
 * A new certificate id, such as `RWR-7KQ2-M9XD`: eight characters drawn with a
 * cryptographic generator, which gives 31⁸ (about 850 thousand million) possible ids.
 */
export function newCertificateId(randomIndex: RandomIndex = randomInt): string {
  const groups = Array.from({ length: GROUPS }, () =>
    Array.from(
      { length: GROUP_LENGTH },
      () => CERTIFICATE_ALPHABET[randomIndex(CERTIFICATE_ALPHABET.length)] ?? '',
    ).join(''),
  );
  return [PREFIX, ...groups].join('-');
}

/** Reads an id as a person may type it: in any case and with spaces around it. */
export function normaliseCertificateId(typed: string): string {
  return typed.trim().toUpperCase();
}
