import type { RegionProfile } from '../schema/region-profile.ts';

import { PAY_LATER_SOURCE } from './pay-later-source.ts';

export const UK_PROFILE = {
  region: 'uk',
  name: 'United Kingdom',
  currency: 'GBP',
  locale: 'en-GB',
  classification: {
    name: 'SOC 2020',
    publisher: 'Office for National Statistics',
    summary:
      'The UK Standard Occupational Classification, which groups jobs ' +
      'by the kind of work they involve and the skills it takes.',
  },
  aiSkillsFramework: {
    title: 'AI Skills for Business Competency Framework v3.0.0',
    publisher: 'The Alan Turing Institute',
    url: 'https://zenodo.org/records/18892559',
  },
  employerCase: {
    headline: 'In the UK, many employees can ask for time off work to train.',
    quote:
      'Staff may have the right to ask for time off work for training or study. […] ' +
      'Time off is usually unpaid unless the employer agrees to pay it.',
    explanation: [
      'This is a right to ask for time off to train, not a right to have a course paid for.',
      'It covers employees who have worked for their employer for at least 26 weeks, in an',
      'organisation where at least 250 people work, when the training helps them do their job',
      'better.',
      'The page does not say the employer must pay for the course, and the time off itself is',
      'usually unpaid unless the employer agrees to pay it.',
    ].join(' '),
    source: {
      title: 'Training and study at work: your rights',
      url: 'https://www.gov.uk/training-study-work-your-rights',
    },
  },
  payLater: [
    {
      country: 'GB',
      product: 'Pay in 3',
      minimum: { currency: 'GBP', minorUnits: 2_000 },
      maximum: { currency: 'GBP', minorUnits: 300_000 },
      ...PAY_LATER_SOURCE,
    },
  ],
} satisfies RegionProfile;
