export const marketplaceEn = {
  'market.wait.courses': 'Rex is finding your courses…',

  'problem.marketplace_conflict':
    'This operation cannot be completed with the current wallet balance. Add funds and try again. If a payment is being processed, wait for its result.',
  'problem.sign_in_required': 'Sign in to open this workspace.',
  'problem.invalid_credentials': 'Use Rewire as the username and DemoDemoDemo as the password.',

  'market.signInTraining': 'Sign in to explore the training available to you.',
  'dashboard.tab.courses': 'Courses',
  'dashboard.tab.payments': 'Payments',
  'dashboard.tab.calendar': 'Calendar',
  'dashboard.next': 'Your next step',
  'dashboard.nextBody': 'Explore your learning plan and find the skills to build next.',
  'dashboard.calendarBody': 'Make space for learning with your plan in time.',
} as const;
export type MarketplaceCatalogue = Readonly<Record<keyof typeof marketplaceEn, string>>;
