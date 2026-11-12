/**
 * A deterministic stand-in for the language model, for end-to-end tests only. It runs the
 * guide's three jobs with the real tools and fixed sentences, so the browser can go through
 * the whole product with no key and no network, and every test sees the same answers.
 *
 * It follows the guide's rules as a careful model would: it proposes only what the search
 * returned, writes no figure, since the page draws every number from the server's data, and tags
 * only tasks present in the facts it receives.
 */
import {
  createScriptedModel,
  type ScriptedModel,
  type ScriptedTurn,
} from '../../../apps/api/tests/support/scripted-model.ts';

type Language = 'en' | 'es';

/** Words that say nothing about a job, left out of the search. */
const STOP_WORDS = new Set(
  (
    'a an and are as at be by for from i in is it its me my of on or our so the their them they ' +
    'this to we with work works working job do does doing all also each every lot some most ' +
    'handle handles manage manages look looks after help helps take takes care make makes ' +
    'el la los las un una y o de del en con por para que mi mis me es soy trabajo hago'
  ).split(' '),
);
const SEARCH_WORDS = 2;

const TEXTS = {
  en: {
    interpreted: 'This is the occupation of the official classification that fits what you do.',
    notFound: 'I could not find your job in the classification. Tell me the title you would use.',
    week: 'Your week is weighed by the time you give each task.',
    mean: 'Across the occupation, some tasks are far more exposed than others.',
    tasks: (first: string, second: string) =>
      `The most exposed task is ${first}, followed by ${second}. They are where AI can help first.`,
    bought:
      'I have prepared the purchase of the course you asked for. Nothing is charged until you approve it in PayPal.',
    nothingToBuy: 'You already have every paid course of your plan.',
    overview: 'Here are your report and your learning plan. The free courses come first.',
    noOccupation: 'Choose your occupation first, and I will read its report and plan with you.',
    planChanged: 'I have changed your plan in time. The chart shows it at once.',
  },
  es: {
    interpreted: 'Esta es la ocupación de la clasificación oficial que encaja con lo que haces.',
    notFound: 'No he encontrado tu trabajo en la clasificación. Dime el nombre que usarías.',
    week: 'Tu semana se pondera con el tiempo que das a cada tarea.',
    mean: 'En el conjunto de la ocupación, unas tareas están mucho más expuestas que otras.',
    tasks: (first: string, second: string) =>
      `La tarea más expuesta es ${first}, seguida de ${second}. Es donde la IA puede ayudar antes.`,
    bought:
      'He preparado la compra del curso que has pedido. No se cobra nada hasta que lo apruebes en PayPal.',
    nothingToBuy: 'Ya tienes todos los cursos de pago de tu plan.',
    overview: 'Aquí tienes tu informe y tu plan de aprendizaje. Los cursos gratuitos van primero.',
    noOccupation: 'Elige primero tu ocupación y leeré contigo su informe y su plan.',
    planChanged: 'He cambiado tu plan en el tiempo. El gráfico ya lo muestra.',
  },
} as const;

/** The guide's model for the end-to-end server. */
export function createDemoModel(): ScriptedModel {
  return createScriptedModel(async (turn) => {
    if (turn.toolNames.includes('prepare_course_purchase')) {
      return converse(turn);
    }
    if (turn.toolNames.includes('propose_occupations')) {
      return interpret(turn);
    }
    return explain(turn);
  });
}

/** The language the instructions ask for. */
function languageOf({ request }: ScriptedTurn): Language {
  return /\bin Spanish\b/.test(request.system) ? 'es' : 'en';
}

function lastUserText({ request }: ScriptedTurn): string {
  return request.turns.findLast((turn) => turn.role === 'user')?.text ?? '';
}

/** Searches with the first meaningful words of the description and proposes the first result. */
async function interpret(turn: ScriptedTurn): Promise<string> {
  const texts = TEXTS[languageOf(turn)];
  if (/xyzzy/i.test(lastUserText(turn))) {
    return languageOf(turn) === 'es' ? '¿Qué tareas realizas?' : 'What tasks do you do?';
  }
  const words = lastUserText(turn)
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  // The first words together, then each of them alone until one is found.
  const queries = [words.slice(0, SEARCH_WORDS).join(' '), ...words.slice(0, SEARCH_WORDS)];
  for (const query of queries.filter((candidate) => candidate.length >= 2)) {
    const first =
      /^code (\S+) \|.*\| (?:international group (\d{4})|no international group) \|/m.exec(
        await turn.call('search_occupations', { query }),
      );
    if (first !== null) {
      const [, code = '', isco08 = ''] = first;
      await turn.call('propose_occupations', { choices: [{ code, isco08 }] });
      return texts.interpreted;
    }
  }
  return texts.notFound;
}

/** Two short paragraphs in words, with the tags of the two most exposed tasks of the facts. */
function explain(turn: ScriptedTurn): string {
  const texts = TEXTS[languageOf(turn)];
  const facts = turn.request.turns[0]?.text ?? '';
  const scored = /^Score of the person's week, 0 to 100: \d+$/m.test(facts);
  const tags = [...facts.matchAll(/^(\[T\d+\]) /gm)].map(([, tag]) => tag ?? '');
  const [first = '', second = first] = tags;
  const opening = scored ? `${texts.week} ${texts.mean}` : texts.mean;
  return [opening, texts.tasks(first, second)].join('\n\n');
}

/** The first day of the coming January, written as `YYYY-MM-DD`. */
function nextJanuary(): string {
  return `${new Date().getFullYear() + 1}-01-04`;
}

/**
 * The change of the plan in time a request asks for, in the words of the suggestions under the
 * plan: fewer hours a week, a start in January, or the paid courses left out.
 */
async function planChangeOf(turn: ScriptedTurn, isco08: string): Promise<object | null> {
  const text = lastUserText(turn).toLowerCase();
  const hours = /\b(\d{1,2}) (?:hours|horas)\b/.exec(text)?.[1];
  if (hours !== undefined) {
    return { isco08, hoursPerWeek: Number(hours) };
  }
  if (/\b(january|enero)\b/.test(text)) {
    return { isco08, startsOn: nextJanuary() };
  }
  if (/\b(paid courses|cursos de pago)\b/.test(text)) {
    const plan = await turn.call('read_study_plan', { isco08 });
    const paid = [...plan.matchAll(/^- id (\S+) \| paid demo/gm)].map(([, id]) => id ?? '');
    return { isco08, leaveOut: paid };
  }
  return null;
}

/** Buys the first paid course not taken yet when asked to; otherwise reads the report and plan. */
async function converse(turn: ScriptedTurn): Promise<string> {
  const texts = TEXTS[languageOf(turn)];
  const isco08 = /international group (\d{4})/.exec(turn.request.system)?.[1];
  if (isco08 === undefined) {
    return texts.noOccupation;
  }
  const change = await planChangeOf(turn, isco08);
  if (change !== null) {
    await turn.call('change_study_plan', change);
    return texts.planChanged;
  }
  if (/\b(buy|comprar)\b/i.test(lastUserText(turn))) {
    const plan = await turn.call('read_learning_plan', { isco08 });
    const course = /^- paid demo course, id (\S+): (.+), \S+ \S+, status none$/m.exec(plan);
    if (course === null) {
      return texts.nothingToBuy;
    }
    const [, courseId = ''] = course;
    await turn.call('prepare_course_purchase', { courseId });
    return texts.bought;
  }
  await turn.call('read_exposure_report', { isco08 });
  await turn.call('read_learning_plan', { isco08 });
  return texts.overview;
}
