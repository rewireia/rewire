import type { FreeCourse } from '../schema/course.ts';

/** Day every link and "free" claim below was last checked against the provider's page. */
const CHECKED_ON = '2026-11-11';

/**
 * Free courses run by others, listed before any paid course. The summaries are Rewire's
 * own words; titles are the providers' official course names. `hours` is set only where the
 * provider states one total for the whole course: a figure per part, a number of weeks or
 * of credits is not turned into hours here.
 */
export const FREE_COURSES: readonly FreeCourse[] = [
  {
    id: 'elements-of-ai-introduction',
    title: 'Introduction to AI',
    provider: 'Elements of AI (University of Helsinki and MinnaLearn)',
    url: 'https://www.elementsofai.com/',
    summary:
      'A self-paced course for people with no technical background on what AI is, ' +
      'what it can and cannot do, and how it affects daily life and work.',
    stage: 'understand',
    languages: ['en'],
    hours: null,
    regions: [],
    checkedOn: CHECKED_ON,
  },
  {
    id: 'hp-life-ai-for-beginners',
    title: 'AI for Beginners',
    provider: 'HP LIFE',
    url: 'https://www.life-global.org/course/391-ai-for-beginners',
    summary:
      'A short online course on the basic ideas behind AI, the part data plays in it ' +
      'and how businesses put it to use.',
    stage: 'understand',
    languages: ['en'],
    hours: null,
    regions: [],
    checkedOn: CHECKED_ON,
  },
  {
    id: 'ai-fluency-framework-foundations',
    title: 'AI Fluency: Framework & Foundations',
    provider: 'Anthropic Academy',
    url: 'https://anthropic.skilljar.com/ai-fluency-framework-foundations',
    summary:
      'A course on working with AI assistants in practice: describing a task well, ' +
      'judging what comes back and using the tools with care.',
    stage: 'apply',
    languages: ['en'],
    // As listed in the provider's own catalogue, https://www.anthropic.com/learn ("4 hr").
    hours: 4,
    regions: [],
    checkedOn: CHECKED_ON,
  },
  {
    id: 'ethics-of-ai',
    title: 'Ethics of AI',
    provider: 'University of Helsinki',
    url: 'https://ethics-of-ai.mooc.fi/',
    summary:
      'An online course for anyone who wants to understand the ethical questions AI raises ' +
      'and how to reason about them.',
    stage: 'strengthen',
    languages: ['en'],
    hours: null,
    regions: [],
    checkedOn: CHECKED_ON,
  },
  {
    id: 'make-america-ai-ready',
    title: 'Make America AI-Ready',
    provider: 'U.S. Department of Labor',
    url: 'https://www.dol.gov/newsroom/releases/osec/osec20260324',
    summary:
      'A basic AI literacy course delivered by text message in short daily lessons, ' +
      'so it can be taken on a phone without a computer.',
    stage: 'understand',
    languages: ['en'],
    hours: null,
    regions: ['us'],
    checkedOn: CHECKED_ON,
  },
  {
    id: 'uk-ai-skills-boost',
    title: 'AI Skills Boost',
    provider: 'Department for Science, Innovation and Technology and Skills England',
    url:
      'https://www.gov.uk/government/news/free-ai-training-for-all-as-government-and-industry-' +
      'programme-expands-to-provide-10-million-workers-with-key-ai-skills-by-2030',
    summary:
      'A government programme of short online courses on everyday AI skills for work, ' +
      'open to every adult in the UK, with a badge for completing selected courses.',
    stage: 'understand',
    languages: ['en'],
    hours: null,
    regions: ['uk'],
    checkedOn: CHECKED_ON,
  },
  {
    id: 'merit-fundamentals-of-ai',
    title: 'Fundamentals of Artificial Intelligence - MERIT Short Course Series',
    provider: 'Vilnius Gediminas Technical University, on the Digital Skills and Jobs Platform',
    url:
      'https://digital-skills-jobs.europa.eu/en/learning-space/training-catalogue/' +
      'fundamentals-artificial-intelligence-merit-short-course-series',
    summary:
      'An open online course, funded by the EU Digital Europe Programme, that covers the core ' +
      'ideas of AI for people who have finished secondary education.',
    stage: 'understand',
    languages: ['en'],
    hours: null,
    regions: ['eu'],
    checkedOn: CHECKED_ON,
  },
];
