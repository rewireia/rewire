import type { RegionProfile } from '../schema/region-profile.ts';

import { PAY_LATER_SOURCE } from './pay-later-source.ts';

/** Article 4(1) of the AI Act, copied word for word from the consolidated text. */
const AI_ACT_ARTICLE_4 = [
  'Providers and deployers of AI systems shall take measures to support the development of AI',
  'literacy of their staff and other persons dealing with the operation and use of AI systems on',
  'their behalf, taking into account their technical knowledge, experience, education and training',
  'and the context the AI systems are to be used in, and considering the persons or groups of',
  'persons on whom the AI systems are to be used. This obligation does not require providers or',
  'deployers to guarantee any specific level of AI literacy of any individual.',
].join(' ');

export const EU_PROFILE = {
  region: 'eu',
  name: 'European Union',
  currency: 'EUR',
  locale: 'en-IE',
  classification: {
    name: 'ESCO v1.2.1',
    publisher: 'European Commission',
    summary:
      'The European classification of skills, competences and occupations. ' +
      'Every ESCO occupation belongs to an ISCO-08 unit group.',
  },
  aiSkillsFramework: {
    title: 'DigComp 3.0, the Digital Competence Framework for Citizens',
    publisher: 'European Commission, Joint Research Centre',
    url:
      'https://joint-research-centre.ec.europa.eu/projects-and-activities/education-and-training/' +
      'digital-transformation-education/digital-competence-framework-citizens-digcomp_en',
  },
  employerCase: {
    headline:
      'The EU AI Act asks organisations that use AI to build the AI literacy of their staff.',
    quote: AI_ACT_ARTICLE_4,
    explanation: [
      'Article 4 applies to organisations that provide or use AI systems, and it asks them to take',
      'measures so that the people who work with those systems understand them.',
      'It does not name a course or say who pays for one, and it does not require any particular',
      'level of skill; training on the AI used in your job is one measure an employer can take.',
    ].join(' '),
    source: {
      title:
        'Regulation (EU) 2024/1689 (AI Act), Article 4(1), consolidated text of 27 July 2026, ' +
        'as replaced by Regulation (EU) 2026/1744',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727',
    },
  },
  payLater: [
    {
      country: 'ES',
      product: 'Pay in 3',
      minimum: { currency: 'EUR', minorUnits: 2_000 },
      maximum: { currency: 'EUR', minorUnits: 200_000 },
      ...PAY_LATER_SOURCE,
    },
    {
      country: 'FR',
      product: 'Pay in 4X',
      minimum: { currency: 'EUR', minorUnits: 2_000 },
      maximum: { currency: 'EUR', minorUnits: 300_000 },
      ...PAY_LATER_SOURCE,
    },
    {
      country: 'IT',
      product: 'Pay in 3',
      minimum: { currency: 'EUR', minorUnits: 2_000 },
      maximum: { currency: 'EUR', minorUnits: 300_000 },
      ...PAY_LATER_SOURCE,
    },
    {
      country: 'DE',
      product: 'Pay in 30 Days',
      minimum: { currency: 'EUR', minorUnits: 100 },
      maximum: { currency: 'EUR', minorUnits: 300_000 },
      ...PAY_LATER_SOURCE,
    },
  ],
} satisfies RegionProfile;
