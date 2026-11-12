import type {
  Explanation,
  ExplanationRequest,
  GuideCard,
  GuideLanguage,
  GuideReply,
  GuideRequest,
  InterpretResult,
  Region,
} from '@rewire/contracts';
import type { Engine, ExposureProfile, OccupationMatch } from '@rewire/engine';

import { HttpProblem } from '../../http/problem.ts';
import { presentMatch } from '../occupations/present.ts';

import { answerThatPassesChecks } from './checked-answer.ts';
import { descriptionSearch, spanishTitleBridge, withoutGreeting } from './description-search.ts';
import { explainReport } from './explain.ts';
import { conversationInstructions, interpreterInstructions } from './instructions.ts';
import { GuideModelError, type GuideModel } from './model.ts';
import { speakingPlainly } from './plain-text.ts';
import { studyPlanTools } from './plan-tools.ts';
import { meteredBy, type TokenBudget } from './token-budget.ts';
import {
  learningTools,
  occupationTools,
  type ToolDependencies,
  type ToolSession,
} from './tools.ts';

/** A plain search this good needs no model to interpret it. */
const CONFIDENT_SCORE = 0.75;
const PLAIN_SEARCH_RESULTS = 5;
const SEARCH_ONLY_NOTE: Readonly<Record<GuideLanguage, string>> = {
  en: 'These are title search results. Try a shorter job title or add details if none fits.',
  es: 'Estos resultados proceden de una búsqueda por título. Prueba un título más breve o añade detalles si ninguno encaja.',
};

/**
 * What the guide says when the model's answer fails the checks twice: nothing of the model
 * is shown, and what its tools found in Rewire's data still is.
 */
const NO_CHECKED_ANSWER: Readonly<Record<GuideLanguage, string>> = {
  en: 'I could not put this into words that pass Rewire’s checks. What I found in its data is shown below; you can also ask me again another way.',
  es: 'No he podido decirlo con palabras que pasen las comprobaciones de Rewire. Lo que he encontrado en sus datos está abajo; también puedes preguntármelo de otra forma.',
};

/** The learner behind a request: who they are now, and how to create them when needed. */
type LearnerOfRequest = Pick<ToolSession, 'learnerId' | 'ensureLearner'>;

/** A request that must never create a learner, such as interpreting a job description. */
const NO_LEARNER: LearnerOfRequest = {
  learnerId: undefined,
  ensureLearner: () => Promise.reject(new Error('this request needs no learner')),
};

export interface GuideDependencies extends ToolDependencies {
  /** Missing when the server has no AI credentials: the guide then says so and steps aside. */
  readonly model: GuideModel | undefined;
  readonly budget: TokenBudget;
}

/**
 * The AI guide. It understands a job described in free words, tells a report in plain
 * language and helps choose and buy a course. In all three it works on what the engine
 * and the catalogue hand it through tools, and adds no fact of its own.
 */
export interface GuideService {
  readonly available: boolean;
  interpret(region: Region, text: string, language: GuideLanguage): Promise<InterpretResult>;
  explain(profile: ExposureProfile, request: ExplanationRequest): Promise<Explanation>;
  converse(request: GuideRequest, learner: LearnerOfRequest): Promise<GuideReply>;
}

/** Runs one job of the model, and turns the model's failures into problems. */
type WithModel = <Result>(run: (model: GuideModel) => Promise<Result>) => Promise<Result>;

export function createGuideService(dependencies: GuideDependencies): GuideService {
  const { engine, budget } = dependencies;
  // Every answer is plain text and counts against the day's budget, whatever becomes of it.
  const model =
    dependencies.model === undefined
      ? undefined
      : meteredBy(budget, speakingPlainly(dependencies.model));
  const withModel = createModelRunner(model);

  return {
    available: model !== undefined,
    interpret: (region, text, language) =>
      interpret({ engine, model, withModel }, region, text, language),
    explain: (profile, request) =>
      withModel((available) =>
        explainReport(
          available,
          profile,
          new Map(Object.entries(request.timeByTask)),
          request.lang,
        ),
      ),
    converse: (request, learner) =>
      withModel(async (available) => {
        const session = sessionFor(request.region, learner);
        const answer = await answerThatPassesChecks(available, {
          system: conversationInstructions(
            request,
            engine.exposureProfile(request.isco08 ?? '')?.title,
          ),
          turns: request.messages,
          tools: [
            ...occupationTools(engine, session),
            ...learningTools(dependencies, session),
            ...studyPlanTools(dependencies.studyPlans, session),
          ],
        });
        return { text: answer ?? NO_CHECKED_ANSWER[request.lang], cards: session.cards };
      }),
  };
}

/** Runs the model and turns its failures into problems. */
function createModelRunner(model: GuideModel | undefined): WithModel {
  return async (run) => {
    if (model === undefined) {
      throw new HttpProblem({
        status: 503,
        code: 'guide_unavailable',
        title: 'The AI guide is not set up',
        detail: 'This server has no AI credentials. Everything else works without the guide.',
      });
    }
    try {
      return await run(model);
    } catch (error) {
      if (error instanceof GuideModelError) {
        throw new HttpProblem({
          status: 502,
          code: `guide_${error.reason}`,
          title: 'The AI guide could not answer',
          detail: 'The guide did not complete its answer. Try again, or carry on without it.',
        });
      }
      throw error;
    }
  };
}

/**
 * The occupations a description is about. A confident plain search is answered without the
 * model; otherwise the model searches and proposes, and only what it was shown can come back.
 */
async function interpret(
  {
    engine,
    model,
    withModel,
  }: { engine: Engine; model: GuideModel | undefined; withModel: WithModel },
  region: Region,
  text: string,
  language: GuideLanguage,
): Promise<InterpretResult> {
  const localText = withoutGreeting(text);
  const described = descriptionSearch(engine, region, localText, language);
  if (described !== undefined) {
    return {
      matches: described.matches.map((match) => presentMatch(engine, match)),
      note: described.note,
      source: 'search',
    };
  }
  const plain = engine.searchOccupations(region, localText, { limit: PLAIN_SEARCH_RESULTS });
  const plainResult = (note: string | null): InterpretResult => ({
    matches: plain.map((match) => presentMatch(engine, match)),
    note,
    source: 'search',
  });
  if (!text.includes('\n') && isConfident(region, plain)) {
    return plainResult(null);
  }
  if (model === undefined) {
    return searchWithoutModel(engine, region, text, language, plain);
  }
  try {
    return await withModel(async (available) => {
      const session = sessionFor(region, NO_LEARNER);
      const answer = await answerThatPassesChecks(available, {
        system: interpreterInstructions(language),
        reasoningEffort: 'low',
        turns: [{ role: 'user', text }],
        tools: occupationTools(engine, session),
      });
      const proposed = session.cards.flatMap((card) =>
        card.type === 'occupations' ? card.matches : [],
      );
      // A note that fails the checks is left out; the occupations the model chose stay.
      const note = answer === undefined || answer === '' ? null : answer;
      if (proposed.length > 0) return { matches: proposed, note, source: 'ai' };
      if (isShortQuestion(note)) return { matches: [], note, source: 'ai' };
      return searchWithoutModel(engine, region, text, language, plain);
    });
  } catch (error) {
    // Model outages or an exhausted budget must not prevent the ordinary search.
    if (error instanceof HttpProblem && (error.status === 429 || error.status === 502)) {
      return searchWithoutModel(engine, region, text, language, plain);
    }
    throw error;
  }
}

/** Only pass through a brief, checked question when the model proposed no occupation. */
function isShortQuestion(text: string | null): text is string {
  return text !== null && text.length <= 240 && /^[^?!\n]*\?$/u.test(text);
}

function searchWithoutModel(
  engine: Engine,
  region: Region,
  text: string,
  language: GuideLanguage,
  plain: readonly OccupationMatch[],
): InterpretResult {
  // The first line is the job field; later lines contain duties. Search the title separately
  // when a full description cannot be interpreted without the model.
  const title = withoutGreeting(text.split(/\r?\n/u)[0] ?? text);
  const described = descriptionSearch(engine, region, title, language);
  if (described !== undefined) {
    return {
      matches: described.matches.map((match) => presentMatch(engine, match)),
      note: described.note,
      source: 'search',
    };
  }
  const titleMatches =
    title === text.trim()
      ? plain
      : engine.searchOccupations(region, title, {
          limit: PLAIN_SEARCH_RESULTS,
        });
  const bridged = spanishTitleBridge(engine, region, title);
  const note: Readonly<Record<GuideLanguage, string>> = {
    en: 'These are possible matches through official occupational groups. Which best describes your duties?',
    es: 'Son posibles opciones relacionadas mediante grupos oficiales. ¿Cuál describe mejor tus tareas?',
  };
  return {
    matches: (bridged.length > 0 ? bridged : titleMatches).map((match) =>
      presentMatch(engine, match),
    ),
    note: bridged.length > 0 ? note[language] : SEARCH_ONLY_NOTE[language],
    source: 'search',
  };
}

function isConfident(region: Region, matches: readonly OccupationMatch[]): boolean {
  const first = matches[0];
  // ESCO translations and alternative titles can name several occupations (for example,
  // a Spanish nursing title also appears on a different healthcare occupation).
  if (region === 'eu' && first?.matchedTitle.language === 'es') return false;
  return (first?.score ?? 0) >= CONFIDENT_SCORE;
}

/**
 * What the tools of one request share. The learner is read at the moment a tool asks: a
 * tool that needed one may have created them earlier in the same answer.
 */
function sessionFor(region: Region, learner: LearnerOfRequest): ToolSession {
  const cards: GuideCard[] = [];
  let learnerId = learner.learnerId;
  return {
    region,
    cards,
    get learnerId() {
      return learnerId;
    },
    async ensureLearner() {
      learnerId = await learner.ensureLearner();
      return learnerId;
    },
  };
}
