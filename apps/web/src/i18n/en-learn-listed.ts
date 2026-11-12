/** English messages of a listed course the learner bought: it is taken at its provider. */
export const learnListedEn = {
  'learnListed.eyebrow': 'Sandbox enrolment',
  'learnListed.enrolled': 'You are enrolled (sandbox). The course is taken at {provider}.',
  'learnListed.body':
    '{brand} links to this course on its provider’s site and copies none of it, so it has no lessons, quiz or certificate here. The payment was made in the PayPal sandbox: no real money moved and the provider was not paid.',
  'learnListed.hours': 'The provider states {hours} h.',
  'learnListed.open': 'Open the course at {provider}',
  'learnListed.newTab': '(opens in a new tab)',
} as const;

export type LearnListedCatalogue = Readonly<Record<keyof typeof learnListedEn, string>>;
