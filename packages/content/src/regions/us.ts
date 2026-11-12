import type { RegionProfile } from '../schema/region-profile.ts';

import { PAY_LATER_SOURCE } from './pay-later-source.ts';

export const US_PROFILE = {
  region: 'us',
  name: 'United States',
  currency: 'USD',
  locale: 'en-US',
  classification: {
    name: 'O*NET 31.0',
    publisher: 'U.S. Department of Labor, Employment and Training Administration',
    summary:
      'The US database of occupations and the tasks they involve, ' +
      'organised by the Standard Occupational Classification.',
  },
  aiSkillsFramework: {
    title: 'AI Literacy Framework (Training and Employment Notice 07-25)',
    publisher: 'U.S. Department of Labor, Employment and Training Administration',
    url:
      'https://www.dol.gov/sites/dolgov/files/ETA/advisories/TEN/2025/TEN%2007-25/' +
      'TEN%2007-25%20%28complete%20document%29.pdf',
  },
  employerCase: {
    headline: 'US employers can pay for education tax-free, up to a yearly limit.',
    quote:
      'You can exclude up to $5,250 of educational assistance you provide to an employee under ' +
      'an educational assistance program from the employee’s wages each year.',
    explanation: [
      'Section 127 of the Internal Revenue Code lets an employer that runs an educational',
      'assistance program pay for an employee’s courses without the payment counting as wages,',
      'up to the yearly amount quoted.',
      'The rule does not oblige any employer to offer such a program: whether yours has one, and',
      'what it covers, is for your employer to say.',
    ].join(' '),
    source: {
      title: 'IRS Publication 15-B (2026), Employer’s Tax Guide to Fringe Benefits',
      url: 'https://www.irs.gov/publications/p15b',
    },
  },
  payLater: [
    {
      country: 'US',
      product: 'Pay in 4',
      minimum: { currency: 'USD', minorUnits: 1_000 },
      maximum: { currency: 'USD', minorUnits: 200_000 },
      ...PAY_LATER_SOURCE,
    },
    {
      country: 'US',
      product: 'Pay Monthly',
      minimum: { currency: 'USD', minorUnits: 4_900 },
      maximum: { currency: 'USD', minorUnits: 1_000_000 },
      ...PAY_LATER_SOURCE,
    },
  ],
} satisfies RegionProfile;
