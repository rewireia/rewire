import { describe, expect, it } from 'vitest';

import {
  certificateRequestSchema,
  dataSourceSchema,
  guideRequestSchema,
  personalExposureSchema,
  learnerProfileSchema,
  moneySchema,
  occupationSearchQuerySchema,
  paymentConfigSchema,
  problemSchema,
  sponsorshipRequestSchema,
  startOrderRequestSchema,
} from '../src/index.ts';

describe('occupationSearchQuerySchema', () => {
  it('reads the limit from a query string and defaults it to 8', () => {
    expect(occupationSearchQuerySchema.parse({ q: 'payroll clerk', limit: '3' }).limit).toBe(3);
    expect(occupationSearchQuerySchema.parse({ q: 'payroll clerk' }).limit).toBe(8);
  });

  it('trims the text and refuses one too short to search', () => {
    expect(occupationSearchQuerySchema.parse({ q: '  nurse  ' }).q).toBe('nurse');
    expect(occupationSearchQuerySchema.safeParse({ q: ' n ' }).success).toBe(false);
  });

  it('refuses a limit outside 1 to 20', () => {
    expect(occupationSearchQuerySchema.safeParse({ q: 'nurse', limit: '0' }).success).toBe(false);
    expect(occupationSearchQuerySchema.safeParse({ q: 'nurse', limit: '21' }).success).toBe(false);
  });
});

describe('moneySchema', () => {
  it('accepts whole minor units in the three currencies', () => {
    for (const currency of ['USD', 'GBP', 'EUR']) {
      expect(moneySchema.safeParse({ currency, minorUnits: 4900 }).success).toBe(true);
    }
  });

  it('refuses fractions of a minor unit, negative amounts and other currencies', () => {
    expect(moneySchema.safeParse({ currency: 'USD', minorUnits: 49.5 }).success).toBe(false);
    expect(moneySchema.safeParse({ currency: 'USD', minorUnits: -1 }).success).toBe(false);
    expect(moneySchema.safeParse({ currency: 'JPY', minorUnits: 4900 }).success).toBe(false);
  });
});

describe('startOrderRequestSchema', () => {
  it('carries a course and a region, and no amount', () => {
    const parsed = startOrderRequestSchema.parse({
      courseId: 'ai-foundations',
      region: 'uk',
      amount: 1,
    });
    expect(parsed).toEqual({ courseId: 'ai-foundations', region: 'uk' });
  });
});

describe('paymentConfigSchema', () => {
  it('describes a region that can sell', () => {
    const config = { available: true, environment: 'sandbox', clientId: 'client', currency: 'GBP' };
    expect(paymentConfigSchema.safeParse(config).success).toBe(true);
  });

  it('accepts a fictional demo buyer and rejects real-domain addresses', () => {
    const config = { available: true, environment: 'sandbox', clientId: 'client', currency: 'GBP' };
    expect(
      paymentConfigSchema.safeParse({
        ...config,
        sandboxBuyer: { email: 'sb-test@personal.example.com', password: 'fictional' },
      }).success,
    ).toBe(true);
    expect(
      paymentConfigSchema.safeParse({
        ...config,
        sandboxBuyer: { email: 'buyer@example.com', password: 'fictional' },
      }).success,
    ).toBe(false);
  });

  it('describes a server without credentials by its reason, never by a client id', () => {
    expect(
      paymentConfigSchema.parse({ available: false, reason: 'not set up', clientId: 'x' }),
    ).toEqual({
      available: false,
      reason: 'not set up',
    });
  });
});

describe('learnerProfileSchema', () => {
  const profile = {
    region: 'us',
    occupation: { code: '43-3051.00', title: 'Payroll Clerk', isco08: '4313' },
    timeByTask: { '4313-1': 'most' },
  };

  it('accepts a confirmed occupation with the time given to its tasks', () => {
    expect(learnerProfileSchema.safeParse(profile).success).toBe(true);
  });

  it('refuses an international group that is not four digits', () => {
    const wrong = { ...profile, occupation: { ...profile.occupation, isco08: '431' } };
    expect(learnerProfileSchema.safeParse(wrong).success).toBe(false);
  });

  it('refuses a time share that is not one of the four answers', () => {
    expect(
      learnerProfileSchema.safeParse({ ...profile, timeByTask: { '4313-1': 'all' } }).success,
    ).toBe(false);
  });
});

describe('sponsorshipRequestSchema', () => {
  it('needs a real email address for the employer', () => {
    const request = { courseId: 'ai-foundations', region: 'eu', employerEmail: 'not-an-address' };
    expect(sponsorshipRequestSchema.safeParse(request).success).toBe(false);
    expect(
      sponsorshipRequestSchema.safeParse({ ...request, employerEmail: 'hr@example.com' }).success,
    ).toBe(true);
  });
});

describe('certificateRequestSchema', () => {
  it('trims the name and refuses an empty one', () => {
    expect(certificateRequestSchema.parse({ learnerName: '  Ada Lovelace ' }).learnerName).toBe(
      'Ada Lovelace',
    );
    expect(certificateRequestSchema.safeParse({ learnerName: ' ' }).success).toBe(false);
  });
});

describe('guideRequestSchema', () => {
  it('answers in English unless a language is given', () => {
    const request = guideRequestSchema.parse({
      messages: [{ role: 'user', text: 'Hello' }],
      region: 'eu',
    });
    expect(request.lang).toBe('en');
  });

  it('refuses an empty conversation', () => {
    expect(guideRequestSchema.safeParse({ messages: [], region: 'eu' }).success).toBe(false);
  });
});

describe('problemSchema', () => {
  it('accepts the body of an error answer', () => {
    const problem = { status: 404, code: 'not_found', title: 'Not found', requestId: 'abc' };
    expect(problemSchema.safeParse(problem).success).toBe(true);
  });
});

describe('personalExposureSchema', () => {
  const exposure = {
    score: 0.5,
    range: { low: 0.4, high: 0.6 },
    weekByBand: { high: 0, medium: 60, low: 40, 'very-low': 0 },
    tasksCounted: 5,
  };

  it('accepts whole points of the week in each band', () => {
    expect(personalExposureSchema.safeParse(exposure).success).toBe(true);
  });

  it('refuses negative or fractional points', () => {
    for (const medium of [-5, 59.5]) {
      const week = { ...exposure.weekByBand, medium };
      expect(personalExposureSchema.safeParse({ ...exposure, weekByBand: week }).success).toBe(
        false,
      );
    }
  });
});

describe('dataSourceSchema', () => {
  const source = {
    id: 'ilo-genai-exposure',
    title: 'Generative AI and jobs',
    publisher: 'International Labour Organization',
    version: 'ILO Working Paper 140 (2025)',
    url: 'https://www.ilo.org/',
    licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    attribution: 'ILO',
    adaptationNotice: null,
    retrievedOn: '2026-11-11',
  };

  it('accepts the day a source was retrieved as an ISO date', () => {
    expect(dataSourceSchema.safeParse(source).success).toBe(true);
  });

  it('refuses a retrieval day that is not an ISO date', () => {
    expect(dataSourceSchema.safeParse({ ...source, retrievedOn: '11/11/2026' }).success).toBe(
      false,
    );
  });
});
