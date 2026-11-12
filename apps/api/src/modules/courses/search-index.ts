import {
  COURSE_TOPIC_LABELS,
  SELLABLE_COURSES,
  sellableCourses,
  type SellableCourse,
} from '@rewire/content';
import { tokensOf } from '@rewire/engine';

/**
 * Words of a request to a course guide that say nothing about the subject, in English and
 * Spanish, written as `tokensOf` leaves them: folded and in the singular.
 */
const QUERY_STOP_WORDS: ReadonlySet<string> = new Set(
  (
    'i me my want would like need learn learning about how what which some course training ' +
    'class get better more good help please something thing do be use using into from is are ' +
    'yo me mi quiero querria gustaria necesito aprender sobre como que cual algun alguno ' +
    'curso formacion clase mejor mejorar mas bueno ayuda algo cosa hacer ser usar desde es ' +
    'son al lo le se'
  )
    .split(' ')
    .flatMap((word) => tokensOf(word)),
);

/**
 * Spanish words of the subjects of the catalogue, and the English words its courses use for
 * them, so that a request in Spanish finds courses written in English. Keys and values are
 * written as `tokensOf` leaves them.
 */
const SPANISH_TO_ENGLISH: Readonly<Record<string, readonly string[]>> = {
  ia: ['ai'],
  inteligencia: ['ai', 'intelligence'],
  generativa: ['generative'],
  generativo: ['generative'],
  dato: ['data'],
  analitica: ['analytic'],
  analisi: ['analysi', 'analytic'],
  informe: ['report'],
  panel: ['dashboard'],
  base: ['database'],
  seguridad: ['security'],
  ciberseguridad: ['security', 'cybersecurity'],
  privacidad: ['privacy'],
  identidad: ['identity'],
  amenaza: ['threat'],
  cumplimiento: ['compliance'],
  nube: ['cloud'],
  red: ['network'],
  infraestructura: ['infrastructure'],
  servidor: ['server'],
  contenedor: ['container'],
  automatizacion: ['automation', 'automate'],
  automatizar: ['automate', 'automation'],
  flujo: ['workflow'],
  agente: ['agent'],
  asistente: ['assistant', 'copilot'],
  desarrollo: ['development', 'develop'],
  programacion: ['programming', 'code'],
  programar: ['programming', 'code'],
  codigo: ['code'],
  aplicacion: ['app', 'application'],
  modelo: ['model'],
  lenguaje: ['language'],
  automatico: ['machine'],
  negocio: ['business'],
  empresa: ['business'],
  gestion: ['management', 'manage'],
  liderazgo: ['leadership', 'leader'],
  venta: ['sale'],
  finanza: ['finance'],
  cliente: ['customer'],
  productividad: ['productivity'],
  colaboracion: ['collaboration'],
  reunion: ['meeting'],
  correo: ['email', 'outlook'],
  hoja: ['spreadsheet', 'excel'],
  presentacion: ['presentation', 'powerpoint'],
  documento: ['document', 'word'],
  oficina: ['office'],
  educacion: ['education'],
  docente: ['teacher', 'teaching'],
  profesor: ['teacher', 'educator'],
  ensenanza: ['teaching'],
  escuela: ['school'],
  aula: ['classroom'],
  estudiante: ['student'],
  etica: ['ethic'],
  responsable: ['responsible'],
  principiante: ['beginner', 'introduction', 'fundamental'],
  basico: ['fundamental', 'introduction'],
  introduccion: ['introduction'],
  fundamento: ['fundamental'],
  trabajo: ['work'],
  salud: ['health', 'healthcare'],
};

const TITLE_WEIGHT = 3;
const TOPIC_WEIGHT = 2;
const SUMMARY_WEIGHT = 1;
/** Length of the shared beginning that makes "automate" and "automation" the same word. */
const STEM_LENGTH = 6;

const stemOf = (token: string) =>
  token.length > STEM_LENGTH ? token.slice(0, STEM_LENGTH) : token;

/** For each word of a course, the weight of the strongest place it appears in. */
type CourseTerms = ReadonlyMap<string, number>;

function addTerms(terms: Map<string, number>, text: string, weight: number): void {
  for (const token of tokensOf(text)) {
    for (const term of new Set([token, stemOf(token)])) {
      terms.set(term, Math.max(terms.get(term) ?? 0, weight));
    }
  }
}

function termsOf(course: SellableCourse): CourseTerms {
  const terms = new Map<string, number>();
  addTerms(terms, [course.summary, course.summaryEs ?? ''].join(' '), SUMMARY_WEIGHT);
  const topicWords = course.topics.flatMap((topic) => [
    topic.replaceAll('-', ' '),
    COURSE_TOPIC_LABELS[topic].en,
    COURSE_TOPIC_LABELS[topic].es,
  ]);
  addTerms(terms, [...topicWords, course.provider].join(' '), TOPIC_WEIGHT);
  addTerms(terms, course.title, TITLE_WEIGHT);
  return terms;
}

interface IndexEntry {
  readonly id: string;
  readonly terms: CourseTerms;
}

/** The words of every content course, read once when the server starts. */
const INDEX: readonly IndexEntry[] = SELLABLE_COURSES.map((course) => ({
  id: course.id,
  terms: termsOf(course),
}));

/** The words of the seller's own courses, read again whenever they change. */
let own: { readonly courses: readonly SellableCourse[]; readonly index: readonly IndexEntry[] } = {
  courses: [],
  index: [],
};

function indexNow(): readonly IndexEntry[] {
  const courses = sellableCourses().slice(SELLABLE_COURSES.length);
  const changed =
    courses.length !== own.courses.length ||
    courses.some((course, position) => course !== own.courses[position]);
  if (changed) {
    own = { courses, index: courses.map((course) => ({ id: course.id, terms: termsOf(course) })) };
  }
  return own.index.length === 0 ? INDEX : [...INDEX, ...own.index];
}

/**
 * The words a request is matched on: each word of the request, in the singular and without
 * accents, with the English words a Spanish one stands for. Words with no subject are dropped.
 */
function queryTerms(query: string): string[][] {
  return tokensOf(query)
    .filter((token) => !QUERY_STOP_WORDS.has(token))
    .map((token) => [token, ...(SPANISH_TO_ENGLISH[token] ?? [])]);
}

function scoreOf(terms: CourseTerms, query: readonly string[][]): number {
  return query.reduce((sum, alternatives) => {
    const best = Math.max(
      0,
      ...alternatives.flatMap((word) => [terms.get(word) ?? 0, terms.get(stemOf(word)) ?? 0]),
    );
    return sum + best;
  }, 0);
}

/**
 * The courses of `allowed` that a request names, best first: a word of the title counts more
 * than a subject or the provider, and these more than the summary. Ties keep the order of the
 * catalogue, so the same request always brings the same courses.
 */
export function searchCourses(
  query: string,
  allowed: ReadonlySet<string>,
  limit: number,
): string[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  return indexNow()
    .flatMap((entry, position) => {
      if (!allowed.has(entry.id)) return [];
      const score = scoreOf(entry.terms, terms);
      return score > 0 ? [{ id: entry.id, score, position }] : [];
    })
    .toSorted((a, b) => b.score - a.score || a.position - b.position)
    .slice(0, limit)
    .map((entry) => entry.id);
}
