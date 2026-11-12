/**
 * The guide writes words; the page draws every number next to them, from the engine's data, with
 * its label, its unit and its source. So no figure may stand in what the model writes, and before
 * a text is shown it is read for one.
 *
 * A figure is any of these:
 * - a digit, outside a task tag such as `[T3]`, or a sign of a quantity (%, €, $, £);
 * - a number word from two up, in English or Spanish ("forty", "dos", "cien", "dozens");
 * - "one", "ten", "once", "un", "una" or "uno" before a unit ("one hour", "una hora", "ten of your
 *   tasks"):
 *   alone they are idioms and articles ("one of the most exposed", "una tarea");
 * - a fraction or a multiple ("half", "twice", "two thirds", "la mitad", "el doble");
 * - an ordinal that ranks ("the second most exposed", "en tercer lugar");
 * - a date: a month, a weekday or a day counted from today ("tomorrow", "el mes que viene").
 *
 * These are rules on words, not a reading of meaning: a quantity said in a way they do not list
 * would pass.
 */

/** A reference to a task of the report, such as `[T3]`. */
const TASK_REFERENCE = /\[T(\d+)\]/g;

const NOT_LETTER_BEFORE = '(?<![\\p{L}\\p{N}])';
const NOT_LETTER_AFTER = '(?![\\p{L}\\p{N}])';

/** Alternatives that stand as whole words, Spanish accents included. */
function words(alternatives: readonly string[], flags = 'giu'): RegExp {
  return new RegExp(`${NOT_LETTER_BEFORE}(?:${alternatives.join('|')})${NOT_LETTER_AFTER}`, flags);
}

const CARDINALS = [
  'zero|two|three|four|five|six|seven|eight|nine|eleven|twelve|thirteen|fourteen|fifteen',
  'sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety',
  'hundreds?|thousands?|millions?|billions?|dozens?',
  'cero|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|trece|catorce|quince|dieci\\p{L}+',
  'veinte|veinti\\p{L}+|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa',
  'cien|cientos?|(?:dos|tres|cuatro|seis|sete|ocho|nove)cient\\p{L}+|quinient\\p{L}+',
  'mil|miles|mill[oó]n|millones|docenas?',
];

/** Units a small word counts: "one hour", "una hora", "ten tasks". */
const MEASURES_EN =
  'percent|per\\s+cent|percentage|hours?|minutes?|days?|weeks?|months?|years?|' +
  'euros?|dollars?|pounds?|cents?';
const COUNTS_EN = 'tasks?|courses?|occupations?|jobs?|steps?|places?|positions?|people|workers?';
/** Spanish units after "un" or "una", which are also articles: no days, weeks or years. */
const MEASURES_ES =
  'por\\s+ciento|puntos?(?!\\s+de\\s+vista)|horas?|minutos?|euros?|d[oó]lar(?:es)?|libras?|c[eé]ntimos?';
const COUNTS_ES = 'tareas?|cursos?|ocupaciones|empleos|pasos|puestos|personas|trabajador\\p{L}*';
const DAYS_ES = 'd[ií]as?|semanas?|mes(?:es)?|a[nñ]os?';

/** A small word, then at most two words, then a unit. "Once" is Spanish only: "once a week" is not. */
const before = (word: string, units: string) =>
  `(?:${word})(?=(?:\\s+[\\p{L}-]+){0,2}\\s+(?:${units})${NOT_LETTER_AFTER})`;

const SMALL_WORDS = [
  before('one', MEASURES_EN),
  before('ten', `${MEASURES_EN}|${COUNTS_EN}`),
  before('once', `${MEASURES_ES}|${COUNTS_ES}|${DAYS_ES}`),
  before('un|una|uno', MEASURES_ES),
  '(?<=top\\s+)(?:one|ten)',
];

const FRACTIONS = [
  'half|halves|twice|double(?!-)|triple|quadruple|twofold|threefold|fourfold|tenfold',
  'quarters?|(?:a|one|two)\\s+thirds?|thirds',
  'mitad|doble|triple|tercios?|(?:tercera|cuarta|quinta)\\s+parte',
];

const ORDINALS =
  'first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|' +
  'primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa]|sext[oa]|s[eé]ptim[oa]|octav[oa]|' +
  'noven[oa]|d[eé]cim[oa]';
const RANKS = [
  `(?:${ORDINALS})(?=(?:\\s+\\p{L}+)?\\s+(?:most|least|highest|lowest|place|position|rank|` +
    `más|menos|lugar|puesto|posición)${NOT_LETTER_AFTER})`,
  `(?<=(?:ranks?|ranked|ranking|ocupa(?:\\s+el)?)\\s+)(?:${ORDINALS})`,
];

const DATES = [
  'enero|febrero|marzo|abril|mayo|junio|julio|agosto|se?ptiembre|octubre|noviembre|diciembre',
  'lunes|martes|miércoles|jueves|viernes|sábado|domingo|pasado\\s+mañana',
  '(?:semana|mes|año)\\s+(?:que\\s+viene|próxim[oa]|pasad[oa])|próxim[oa]\\s+(?:semana|mes|año)',
  'tomorrow|yesterday|(?:next|last)\\s+(?:week|month|year)',
];
/** English months and weekdays, capitalised as they are written. "May" and "March" need a cue. */
const DATES_EN = [
  'January|February|April|June|July|August|September|October|November|December',
  'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday',
  '(?<=(?:in|on|of|from|until|by|since|before|after|next|last|early|late|mid-?)\\s+)(?:March|May)',
];

const FIGURES: readonly RegExp[] = [
  /\p{N}+(?:[.,]\p{N}+)*/gu,
  /[%‰€$£¥]/gu,
  words(CARDINALS),
  words(SMALL_WORDS),
  words(FRACTIONS),
  words(RANKS),
  words(DATES),
  words(DATES_EN, 'gu'),
];

/** The figures written in a text, as written and in the order they stand. */
export function figuresIn(text: string): string[] {
  const withoutReferences = text.replace(TASK_REFERENCE, (tag) => ' '.repeat(tag.length));
  return FIGURES.flatMap((pattern) =>
    [...withoutReferences.matchAll(pattern)].map((found) => ({ at: found.index, text: found[0] })),
  )
    .sort((one, other) => one.at - other.at)
    .map((found) => found.text);
}

/** The task references of a text that point at no task of a report with `taskCount` tasks. */
export function taskReferencesBeyond(text: string, taskCount: number): string[] {
  return [...text.matchAll(TASK_REFERENCE)]
    .filter(([, position]) => Number(position) < 1 || Number(position) > taskCount)
    .map(([reference]) => reference);
}
