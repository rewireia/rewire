import type { Explanation, GuideLanguage } from '@rewire/contracts';
import { personalExposureOf, type ExposureProfile, type TimeShare } from '@rewire/engine';

import { HttpProblem } from '../../http/problem.ts';

import { jobLossClaimsIn } from './claims.ts';
import { figuresIn, taskReferencesBeyond } from './figures.ts';
import type { GuideModel } from './model.ts';

const LANGUAGE_NAMES: Readonly<Record<GuideLanguage, string>> = { en: 'English', es: 'Spanish' };
/** The model gets one chance to correct a text that fails the check. */
const ATTEMPTS = 2;

const percent = (score: number) => Math.round(score * 100);

/** The facts the model writes from. It reads their numbers to know what stands out. */
interface FactSheet {
  readonly text: string;
  readonly taskCount: number;
}

function factSheetOf(
  profile: ExposureProfile,
  timeByTask: ReadonlyMap<string, TimeShare>,
): FactSheet {
  const personal = personalExposureOf(profile, timeByTask);
  const week =
    personal.score === null ? 'none: they do none of the tasks' : percent(personal.score);
  const { high, medium, low, 'very-low': veryLow } = personal.weekByBand;
  const lines = [
    `Occupation: ${profile.title}`,
    `Score of the person's week, 0 to 100: ${week}`,
    `Mean score of the occupation, 0 to 100: ${percent(profile.meanScore)}`,
    `Category published by the ILO: ${profile.gradient}`,
    `Standing: number ${profile.standing.moreExposed + 1} of ${profile.standing.outOf} ` +
      'scored occupations, counting from the most exposed',
    `Share of the week by band, in points out of 100: high ${high}, medium ${medium}, ` +
      `low ${low}, very low ${veryLow}`,
    'Tasks, most exposed first (score 0 to 100, band, time the person gives it):',
    ...profile.tasks.map((task, index) => {
      const time = timeByTask.get(task.id) ?? 'some';
      return `[T${index + 1}] ${percent(task.score)}, ${task.band}, ${time}: ${task.text}`;
    }),
  ];
  return { text: lines.join('\n'), taskCount: profile.tasks.length };
}

function instructionsFor(language: GuideLanguage): string {
  return [
    'You explain an exposure report to the person it is about. The report says how much of each task of',
    'their occupation generative AI could technically do, according to the ILO index of 2025.',
    '',
    `Write in ${LANGUAGE_NAMES[language]}, in two or three short paragraphs of plain prose, 140 words at most.`,
    'Speak to the person as "you". Say what stands out: which tasks are most exposed, which are least, and',
    'what that means for how their week is spent. Refer to a task with its tag, such as [T2], right after you',
    'mention it; quote or paraphrase the task in the language you are writing in.',
    '',
    'Rules that are checked before your text is shown:',
    '- Write no number at all: no digits, no number words, no percentages, scores, ranks, fractions, years',
    '  or dates. The page shows every figure next to your words: the score of each task you tag is drawn',
    '  beside its tag. Say "most exposed", "less exposed" or "about the same" instead.',
    '- The scores measure technical potential. They do not predict that anyone will lose a job, and they say',
    "  nothing about the person's own ability: never suggest otherwise.",
    '- No headings, lists, bold or links. No advice about which course to take.',
  ].join('\n');
}

/**
 * Asks the model to tell a report in plain words, and shows nothing that fails the checks:
 * a text with a figure, a task reference that is not in the facts, or a sentence that says,
 * without denying it, that a job will be lost, is sent back once and refused if the correction
 * fails too. The page draws the score of each tagged task beside its tag.
 */
export async function explainReport(
  model: GuideModel,
  profile: ExposureProfile,
  timeByTask: ReadonlyMap<string, TimeShare>,
  language: GuideLanguage,
): Promise<Explanation> {
  const facts = factSheetOf(profile, timeByTask);
  let request = `Facts:\n${facts.text}`;

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const completion = await model.complete({
      system: instructionsFor(language),
      turns: [{ role: 'user', text: request }],
      tools: [],
    });
    const strayFigures = figuresIn(completion.text);
    const strayReferences = taskReferencesBeyond(completion.text, facts.taskCount);
    const claims = jobLossClaimsIn(completion.text);
    const faults = strayFigures.length + strayReferences.length + claims.length;
    if (faults === 0 && completion.text !== '') {
      const paragraphs = completion.text.split(/\n\s*\n/).map((paragraph) => paragraph.trim());
      return { paragraphs: paragraphs.filter((paragraph) => paragraph !== '') };
    }
    request =
      `Facts:\n${facts.text}\n\nYour previous text cannot be shown. Figures, which the page shows and ` +
      `your words must not: ${strayFigures.join(', ') || 'none'}. Task tags that are not in the facts: ` +
      `${strayReferences.join(', ') || 'none'}. Sentences that say a job will be lost, which the ` +
      `scores do not say: ${claims.join(' ') || 'none'}. Write it again without any number, using ` +
      'only what the facts contain.';
  }
  throw new HttpProblem({
    status: 502,
    code: 'explanation_failed_check',
    title: 'The explanation did not pass the checks',
    detail:
      'The guide wrote something your report does not support, so its explanation is not shown.',
  });
}
