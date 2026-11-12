import { conversationEn } from './en-conversation.ts';
import { coursesEn } from './en-courses.ts';
import { offersEn } from './en-offers.ts';
import { marketplaceEn } from './en-marketplace.ts';
import { walletEn } from './en-wallet.ts';
import { businessEn } from './en-business.ts';
import { accountEn } from './en-account.ts';
import { journeyEn } from './en-journey.ts';
import { libraryEn } from './en-library.ts';
import { learnListedEn } from './en-learn-listed.ts';
import { courseSourcesEn } from './en-course-sources.ts';
import { creditsEn } from './en-credits.ts';
import { pagesEn } from './en-pages.ts';
import { insightsEn } from './en-insights.ts';
import { studioEn } from './en-studio.ts';
import { timelineEn } from './en-timeline.ts';

/** English messages of the first screens: header, search, confirmation, report, explorer. */
const base = {
  'nav.label': 'Main',
  'nav.skip': 'Skip to content',
  'nav.home': 'Home',
  'nav.explore': 'Explore',
  'nav.ai': 'What is AI',
  'nav.rewire': 'How it works',
  'nav.library': 'Library',
  'nav.courses': 'Courses',
  'nav.start': 'Start',
  'menu.open': 'Menu',
  'menu.title': 'Menu',
  'menu.close': 'Close the menu',
  'region.short': 'Region',
  'language.label': 'Language',
  'theme.label': 'Theme',
  'theme.toDark': 'Dark theme',
  'theme.toLight': 'Light theme',
  'theme.system': 'Auto',
  'theme.system.name': 'Automatic, as the system',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'footer.sources': 'Credits and sources',
  'footer.label': 'Site',
  'footer.copyright': '© {year} {brand}',
  'footer.privacy': 'Privacy',
  'officialLanguage.note':
    'Official classification titles are shown as their source publishes them.',

  'taskTranslation.loading': 'Loading AI translation of tasks…',
  'taskTranslation.error': 'Task translation unavailable; showing the English originals.',
  'taskTranslation.ready': 'Tasks translated by AI. Hover over a task to see the English original.',

  'region.eu': 'European Union',
  'region.us': 'United States',
  'region.uk': 'United Kingdom',
  'region.eu.classification': 'ESCO',
  'region.us.classification': 'O*NET',
  'region.uk.classification': 'SOC 2020',

  'loading.label': 'Loading',
  'error.title': 'Something went wrong.',
  'error.retry': 'Try again',
  'error.network': '{brand} could not reach its server. Check your connection and try again.',
  'error.invalidAnswer': 'The server sent an answer {brand} could not read. Please try again.',
  'notFound.title': 'This page does not exist.',
  'notFound.body': 'The address may be mistyped, or the page has moved.',
  'notFound.home': 'Go to the start',
  'routeError.title': 'Something went wrong while showing this page.',
  'routeError.body':
    'Your choices are still kept in this browser. Reload the page, or go back to the start.',
  'routeError.reload': 'Reload the page',

  'home.title': 'Which parts of your job can AI do?',
  'gate.title': 'Choose your region',

  'confirm.title': 'Is this your occupation?',
  'confirm.code': 'Code {code}',
  'confirm.groupLabel': 'Read through the international group',
  'confirm.groupExplained':
    'The ILO scores the tasks of the 427 groups of the International Standard Classification of Occupations (ISCO-08), used worldwide.',
  'basis.job-title': 'The official index codes this exact job title to this international group.',
  'basis.classification':
    'This occupation belongs to this international group in its own classification.',
  'basis.exact-match': 'An official crosswalk relates them as an exact match.',
  'basis.close-match': 'An official crosswalk relates them as a close match.',
  'basis.narrow-match': 'An official crosswalk relates them: the international group is narrower.',
  'basis.broad-match': 'An official crosswalk relates them: the international group is broader.',
  'basis.title-majority':
    'Most job titles of this occupation are coded to this international group.',
  'confirm.tasks': 'Does this look like your work?',
  'confirm.yes': 'Yes, show my report',
  'confirm.alternatives': 'Closer to one of these?',
  'confirm.unscored': 'The ILO index has no scores for this occupation yet.',
  'confirm.unscoredShort': 'No scores yet',
  'confirm.noGroup': 'This occupation is not linked to any international group.',
  'confirm.back': 'Search again',
  'confirm.notFound':
    '{brand} could not find this occupation again. Please search for it once more.',
  'confirm.untitledGroup': 'A group the ILO index leaves out',
  'confirm.current': 'Shown now',

  'report.readThrough': 'Read through the international group {title} ({code}).',
  'report.groupOnly': 'International group {code}',
  'report.week.label': 'Your week',
  'report.week.sentence':
    '{brand}’s calculation from the ILO’s scores: the mean of your tasks, weighted by the time you said each takes, from 0 to 100. The models ranged from {low} to {high}.',
  'report.week.none': 'No task takes any of your time, so there is nothing to weigh.',
  'report.week.live': 'Your week now scores {score}.',
  'report.level.label': 'Level',
  'report.standing.label': 'Standing',
  'report.standing.figure': '{rank} of {total}',
  'report.standing.sentence':
    'Of the {total} occupations the ILO scores, {above} have a higher mean score than this one.',
  'report.split.title': 'Exposure at a glance',
  'report.split.caption': 'Estimated from your task weights, not measured working hours.',
  'report.split.item': '{band}: {points} of 100',
  'report.tasks.title': 'Task by task',
  'report.tasks.lede':
    'Your saved answers, ordered by exposure. To change them, start the journey again.',
  'time.most': 'Most',
  'time.some': 'Some',
  'time.little': 'Little',
  'time.none': 'None',
  'report.limits.potential':
    'The score measures what the technology could do with a task. It does not predict that a job will be lost.',
  'report.limits.person': 'It does not judge you or your work: it describes tasks, not people.',
  'report.limits.range':
    'The range between models shows how much they disagreed. It is not a confidence interval.',

  'band.high': 'High',
  'band.medium': 'Medium',
  'band.low': 'Low',
  'band.very-low': 'Very low',
  'gradient.gradient-4': 'Very high',
  'gradient.gradient-3': 'High',
  'gradient.gradient-2': 'Medium',
  'gradient.gradient-1': 'Low, but uneven',
  'gradient.minimal': 'Minimal',
  'gradient.not-exposed': 'Not exposed',
  'gradient.gradient-4.sentence':
    'Many tasks score high, and consistently: one of the occupations generative AI could change most.',
  'gradient.gradient-3.sentence':
    'Several tasks score high: the exposure is clear, though not across the whole job.',
  'gradient.gradient-2.sentence':
    'Some tasks score high, while the rest still rely closely on people.',
  'gradient.gradient-1.sentence': 'Exposure is low overall, but a few tasks score high.',
  'gradient.minimal.sentence':
    'The tasks score low overall: generative AI touches little of this work.',
  'gradient.not-exposed.sentence':
    'The ILO finds no meaningful exposure in the tasks of this occupation.',

  'explore.title': 'Explore the data',
  'explore.lede':
    'Exposure to generative AI, region by region: how much of the work of each region is exposed, told with its own labour statistics. Then explore the 427 occupation groups yourself.',
  'explore.filter': 'Filter by title or code',
  'explore.majorGroups': 'Major groups',
  'explore.mine': 'Go to my occupation',
  'explore.histogram.caption':
    'How the mean scores of all occupations spread, in steps of 5 points out of 100. Your occupation’s bar is in the accent colour.',
  'explore.histogram.count': 'Occupations',
  'explore.none': 'No occupation matches these filters.',
  'explore.count': '{shown} of {total} occupations shown.',
  'explore.col.code': 'Code',
  'explore.col.title': 'Occupation',
  'explore.col.majorGroup': 'Major group',
  'explore.col.exposure': 'Exposure',
  'explore.col.level': 'Level',
  'explore.col.tasks': 'Tasks',

  'method.journey.demo':
    'Use Rewire / DemoDemoDemo for either workspace. The courses {brand} hosts are a demonstration, and PayPal Sandbox uses test money. The buyer details are shown at checkout.',
  'method.steps.title': 'The method',
  'method.step.1.title': 'Recognise the job',
  'method.step.1.body':
    'Your job title is looked up among the official titles of your region: ESCO in the European Union, O*NET in the United States and the SOC 2020 coding index in the United Kingdom.',
  'method.step.2.title': 'Take it to the international group',
  'method.step.2.body':
    'Each regional occupation is linked to one of the 427 groups of the International Standard Classification of Occupations, through the official crosswalks and coding indexes.',
  'method.step.3.title': 'Read the ILO task scores',
  'method.step.3.body':
    'For each task of the group, the ILO index gives a score from 0 to 1 of what generative AI could do, with the range between the models it used.',
  'method.step.4.title': 'Weigh it by your week',
  'method.step.4.body':
    'You say how much of your week each task takes: most, some, little or none, which count 3, 2, 1 and 0. The ILO’s scores are averaged with those weights. The result is {brand}’s own calculation, not a figure the ILO publishes, and it is not a chance of anything: 61 out of 100 does not mean a 61% risk.',
  'method.step.5.title': 'Put it in order',
  'method.step.5.body':
    'Tasks are listed from most to least exposed, and the occupation is placed among all those the ILO scores.',
  'method.limits.title': 'Limits',
  'method.limits.translation':
    'A regional occupation and its international group are not always the same job: the link is official, but it can be broad.',
  'method.photo.title': 'Cover photograph',
  'method.photo.credit':
    'Cover photograph: the Milky Way over the Paranal Observatory, by ESO/H.H. Heyer, CC BY 4.0, cropped and resized.',
  'method.photo.page': 'The original on Wikimedia Commons',
  'method.photo.licence': 'The CC BY 4.0 licence',
  'method.source.publisher': 'Publisher',
  'method.source.version': 'Version',
  'method.source.licence': 'Licence',
  'method.source.retrieved': 'Retrieved on',
  'method.source.attribution': 'Attribution',
  'method.source.adaptation': 'Adaptation notice',
  'method.privacy.title': 'Privacy',
  'method.privacy.body':
    '{brand} keeps as little as it can. The job title you search for is not stored. Your choices of language and theme stay in this browser.',
  'method.privacy.keptTitle': 'What is kept',
  'method.privacy.kept':
    'A session cookie identifies your visit. After Demo sign-in, the confirmed occupation, region, task times, budget, courses, payments and certificate name belong to one shared demonstration account stored on the server. Other Demo visitors can see and change that account. Use fictional details.',
  'method.privacy.notKeptTitle': 'What is not kept',
  'method.privacy.notKept':
    '{brand} does not keep what you write to describe your work, to Rex or to Tempo.',
  'method.privacy.guide.openai':
    'What you write to Rex or to Tempo is sent to an OpenAI model, which answers it.',
  'method.privacy.guide.other':
    'What you write to Rex or to Tempo is sent to an AI model outside {brand}, which answers it.',
} as const;

export type BaseCatalogue = Readonly<Record<keyof typeof base, string>>;

/** The English catalogue: the source of truth for every message key. */
export const en = {
  ...base,
  ...journeyEn,
  ...timelineEn,
  ...studioEn,
  ...insightsEn,
  ...accountEn,
  ...marketplaceEn,
  ...walletEn,
  ...businessEn,
  ...conversationEn,
  ...coursesEn,
  ...offersEn,
  ...pagesEn,
  ...libraryEn,
  ...learnListedEn,
  ...courseSourcesEn,
  ...creditsEn,
} as const;

export type MessageKey = keyof typeof en;

/** A catalogue in another language: the same keys, each with its own text. */
export type Catalogue = Readonly<Record<MessageKey, string>>;
