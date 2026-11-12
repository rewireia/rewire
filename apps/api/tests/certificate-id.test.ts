import { describe, expect, it } from 'vitest';

import {
  CERTIFICATE_ALPHABET,
  newCertificateId,
  normaliseCertificateId,
} from '../src/modules/learning/certificate-id.ts';

describe('certificate ids', () => {
  it('read RWR and two groups of four characters', () => {
    for (let draw = 0; draw < 200; draw += 1) {
      expect(newCertificateId()).toMatch(/^RWR-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    }
  });

  it('use no character that can be mistaken for another', () => {
    for (const ambiguous of ['0', 'O', '1', 'I', 'L']) {
      expect(CERTIFICATE_ALPHABET).not.toContain(ambiguous);
    }
    expect(new Set(CERTIFICATE_ALPHABET).size).toBe(CERTIFICATE_ALPHABET.length);
  });

  it('draw each character from the whole alphabet', () => {
    const last = CERTIFICATE_ALPHABET.length - 1;
    expect(newCertificateId(() => 0)).toBe('RWR-2222-2222');
    expect(newCertificateId(() => last)).toBe('RWR-ZZZZ-ZZZZ');
  });

  it('are read in any case and with spaces around them', () => {
    expect(normaliseCertificateId('  rwr-7kq2-m9xd ')).toBe('RWR-7KQ2-M9XD');
  });
});
