/**
 * Rewire's scores measure what generative AI could technically do in a task. They do not
 * predict that anyone will lose their job, and the guide must never say they do. Before a text is
 * shown, each of its clauses is read for that prediction, built from its parts rather than listed
 * as whole sentences, in English and Spanish:
 *
 * - what happens: a dismissal ("fire you", "let you go", "te despedirán", "te echarán"), a
 *   replacement ("replace you", "take your job", "te sustituirá", "quitarte el puesto"), a job that
 *   disappears ("your job will disappear", "tu puesto desaparecerá") or unemployment ("lose your
 *   job", "out of work", "en el paro", "perderás tu empleo");
 * - to whom: the person ("you", "workers like you", "serás", "te") or their job ("your role",
 *   "tu puesto"), whoever does it, their employer or AI. Parts of a job are not the job: "parts of
 *   your job could be automated" is what the scores do say;
 * - whether it is denied: a negation that bears on the verb ("will not", "does not mean", "no one
 *   can say", "no significa", "nadie puede decir", "nunca") or stands right before it ("not job
 *   loss", "sin perder tu trabajo"), a condition ("if", "whether", "si") or a question. A negation
 *   that strengthens it ("no doubt", "sin duda", "no longer") denies nothing.
 *
 * This is a reading of words by rules, not of meaning. It catches the known ways of saying it;
 * the corpus of the tests lists what it gets wrong.
 */

const ANY_WORD = "(?:[\\p{L}’'-]+\\s+)";

const JOB_EN = 'jobs?|roles?|positions?|posts?|occupations?|professions?|careers?|livelihoods?';
const OWNER_EN = 'your|their|the|a|his|her|my|our|its|this|that|these|those|many|some|most|all';
const JOB_PHRASE_EN = `(?:(?:${OWNER_EN})\\s+${ANY_WORD}?(?:${JOB_EN})|jobs|roles|positions)`;
const YOUR_JOB_EN = `your\\s+${ANY_WORD}?(?:${JOB_EN})`;
const PERSON_EN = `you(?!\\p{L})|workers|people|staff|employees|humans`;
/** The whole job, not parts of it: "parts of your job" is what the scores speak of. */
const NOT_A_PART_EN =
  '(?<!(?:parts?|some|much|aspects?|pieces?|elements?|tasks?|bits?|areas?)\\s+of\\s+)';
const MODAL_EN =
  `(?:['’](?:ll|re|s)|\\s+(?:will|would|could|can|may|might|must|shall|are|is|am|were|was|be|been|` +
  'being|get|gets|got|getting|become|becomes|soon|probably|likely|certainly|surely|definitely|' +
  'eventually|inevitably|going\\s+to|about\\s+to|bound\\s+to|sure\\s+to|set\\s+to|likely\\s+to))';
const FATE_EN =
  'fired|sacked|dismissed|laid\\s+off|let\\s+go|made\\s+redundant|redundant|replaced|displaced|' +
  'automated|eliminated|phased\\s+out|terminated|cut|lost|obsolete|unemployed|wiped\\s+out|' +
  'disappear\\p{L}*|vanish\\p{L}*|go\\s+away|cease\\s+to\\s+exist|die\\s+out|gone|at\\s+risk|' +
  'out\\s+of\\s+(?:a\\s+)?(?:work|job)|no\\s+longer\\s+(?:be\\s+)?(?:needed|necessary|required)';

const ENGLISH = [
  `los(?:e|es|ing|t)\\s+${JOB_PHRASE_EN}`,
  'job\\s+(?:loss(?:es)?|cuts?)|lay-?offs?|redundanc(?:y|ies)|unemploy\\p{L}*|jobless\\p{L}*',
  'out\\s+of\\s+(?:a\\s+)?(?:work|job)',
  `(?:fire|fires|fired|firing|sack|sacks|sacked|sacking|dismiss(?:es|ed|ing)?|replac(?:e|es|ed|ing)|` +
    `displac(?:e|es|ed|ing)|eliminat(?:e|es|ed|ing)|com(?:e|es|ing)\\s+for)\\s+` +
    `(?:${PERSON_EN}|${YOUR_JOB_EN})`,
  `(?:take|takes|taking|took|steal|steals|stealing|stole)(?:\\s+over)?\\s+${YOUR_JOB_EN}`,
  `(?:let|lets|letting)\\s+(?:${PERSON_EN})\\s+go|(?:lay|lays|laying|laid)\\s+(?:${PERSON_EN})\\s+off`,
  `show(?:s|ed)?\\s+(?:${PERSON_EN})\\s+the\\s+door|your\\s+days\\s+(?:${ANY_WORD}){0,3}?are\\s+numbered`,
  `${NOT_A_PART_EN}(?:${JOB_PHRASE_EN})${MODAL_EN}*\\s+(?:${FATE_EN})`,
  `(?:${PERSON_EN})${MODAL_EN}+\\s+(?:${FATE_EN})`,
];

const JOB_ES =
  'puestos?|empleos?|trabajos?|oficios?|profesi[oó]n|profesiones|ocupaci[oó]n|ocupaciones';
const OWNER_ES = 'tu|tus|su|sus|el|los|un|mi|mis|vuestro|nuestro|este|ese|muchos|algunos|la|las';
const JOB_PHRASE_ES = `(?:${OWNER_ES})\\s+(?:${JOB_ES})(?:\\s+de\\s+trabajo)?`;
const NOT_A_PART_ES = '(?<!(?:partes?|algunas?|aspectos?|tareas?)\\s+(?:de|del)\\s+)';
/** A word that is not a negation, between a job and what becomes of it. */
const PLAIN_WORD_ES = '(?:(?!(?:no|nunca|jamás|tampoco)\\s)[\\p{L}-]+\\s+)';
const PEOPLE_ES =
  `ti|tu\\s+(?:${JOB_ES})|` +
  '(?:los|las|a\\s+los|a\\s+las)\\s+(?:trabajador|emplead|personas|plantilla)\\p{L}*';
const CLITIC_ES = '(?:te|os|les)\\s+(?:(?:va|van|vas|iba|iban)\\s+a\\s+)?';
const PARTICIPLE_ES =
  '(?:sustituid|reemplazad|remplazad|despedid|desplazad|eliminad|automatizad|suprimid|obsolet|' +
  'prescindibl|innecesari)\\p{L}*';

const SPANISH = [
  `(?:perd|pierd)\\p{L}*\\s+(?:${OWNER_ES})\\s+${ANY_WORD}?(?:${JOB_ES})`,
  `p[ée]rdidas?\\s+de\\s+(?:(?:${OWNER_ES})\\s+)?(?:${JOB_ES})`,
  'desped\\p{L}*|despid\\p{L}*|desemple\\p{L}*|(?:en|al)\\s+(?:el\\s+)?paro|sin\\s+(?:trabajo|empleo)',
  `${CLITIC_ES}echa\\p{L}*(?!\\s+(?:una\\s+mano|un\\s+cable|un\\s+vistazo|de\\s+menos))|echarte|echaros`,
  `${CLITIC_ES}(?:sustitu|reemplaz|remplaz|desplaz)\\p{L}*|(?:sustituir|reemplazar|desplazar)te`,
  `(?:sustitu|reemplaz|remplaz|desplaz)\\p{L}*\\s+(?:a\\s+)?(?:${PEOPLE_ES})`,
  `(?:te\\s+)?quit\\p{L}*\\s+(?:el|tu)\\s+(?:puesto|empleo|trabajo)|ocupar\\p{L}*\\s+tu\\s+puesto`,
  '(?:ir[áa]s?|acabar[áa]s?|te\\s+(?:pondr|mandar|echar)\\p{L}*)\\s+a\\s+la\\s+calle',
  `(?:serás|vas\\s+a\\s+ser|quedarás|acabarás|puedes\\s+ser|podrías\\s+ser)\\s+(?:${ANY_WORD})?${PARTICIPLE_ES}`,
  'ya\\s+no\\s+(?:serás\\s+necesari\\p{L}*|te\\s+necesitar\\p{L}*|har[áa]s\\s+falta)',
  `${NOT_A_PART_ES}${JOB_PHRASE_ES}\\s+${PLAIN_WORD_ES}{0,3}?(?:desaparec\\p{L}*|dejar\\p{L}*\\s+de\\s+` +
    `existir|se\\s+(?:perder|eliminar|destruir|automatizar)\\p{L}*|${PARTICIPLE_ES}|sobrar\\p{L}*|` +
    'tiene\\s+los\\s+días\\s+contados|(?:está|estará)\\s+en\\s+(?:peligro|riesgo))',
];

/** The prediction, in either language: its parts are alternatives of one pattern. */
const PREDICTION = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${[...ENGLISH, ...SPANISH].join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
);

/**
 * Alternatives that must stand as whole words. Spanish words end in accented letters, which `\b`
 * does not take for letters, so the edges are any letter or digit.
 */
function wholeWords(alternatives: readonly string[], flags: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}])`, flags);
}

/** Phrases with a negation in them that make a claim stronger, not weaker. */
const AFFIRMING = wholeWords(
  [
    'no\\s+(?:doubt|question)',
    'not\\s+(?:a|any|the\\s+(?:slightest|least))\\s+(?:doubt|question)',
    'without\\s+(?:a\\s+|any\\s+)?(?:doubt|question)',
    'no\\s+(?:secret|surprise|wonder)',
    "(?:never|don['’]t|do\\s+not)\\s+doubt",
    'not\\s+only',
    'no\\s+longer',
    'no\\s+(?:cabe|hay|queda)\\s+(?:ninguna\\s+|la\\s+menor\\s+)?duda',
    'sin\\s+(?:ninguna\\s+|lugar\\s+a\\s+)?dudas?',
    'no\\s+es\\s+(?:ningún\\s+)?(?:secreto|sorpresa|de\\s+extrañar)',
    'nadie\\s+duda',
    'no\\s+(?:sólo|solo)',
    'ya\\s+no',
  ],
  'giu',
);

/** A negation that bears on the verb of the clause the claim is in, or says nothing of it. */
const VERB_DENIAL = wholeWords(
  [
    '(?:will|would|could|can|does|do|did|is|are|was|were|should|must|may|might|has|have)\\s+not',
    "(?:won|wouldn|couldn|can|doesn|don|didn|isn|aren|wasn|weren|shouldn|mustn|hasn|haven)['’]t",
    'cannot',
    'never',
    '(?:no\\s+one|no-one|nobody)\\s+(?:can|could|will|is\\s+able\\s+to)\\s+(?:say|tell|know|predict)',
    '(?:says|tells|shows|means|predicts)\\s+nothing',
    'no\\s+(?:sign|evidence|indication|reason|basis)',
    'no\\s+(?:vas|va|van|vais|vamos|voy|perder\\p{L}*|significa\\p{L}*|quieren?\\s+decir|implica\\p{L}*|predic\\p{L}*|predec\\p{L}*|dice\\p{L}*|indica\\p{L}*|mide\\p{L}*|miden|prev\\p{L}*|anticipa\\p{L}*|afirma\\p{L}*|garantiza\\p{L}*|supone\\p{L}*|ser[áa]s?|ser[áa]n|tienes?\\s+por\\s+qué|tienen\\s+por\\s+qué|hay\\s+(?:motivo|razón|indicio|prueba))',
    'nunca',
    'jamás',
    'tampoco',
    'nadie\\s+(?:puede|podría|sabe)',
    'no\\s+se\\s+puede\\s+(?:decir|saber|predecir|afirmar)',
  ],
  'iu',
);

/** A negation right before the claim: "not job loss", "without losing their job". */
const DENIAL_BEFORE = new RegExp(
  '(?<![\\p{L}\\p{N}])(?:not|no|never|without|rather than|instead of|nor|ni|nunca|jamás|sin|en lugar de|en vez de)\\s+$',
  'iu',
);

/** A condition before the claim, within its part of the sentence: "if", "whether", "si". */
const CONDITION = wholeWords(['if', 'whether', 'unless', 'si', 'en\\s+caso\\s+de\\s+que'], 'iu');

/** A claim that opens its clause, denied by the verb after it: "Job loss is not what it measures". */
const OPENS_CLAUSE = /^\s*(?:the|la|el|los|las)?\s*$/iu;
const DENIAL_AFTER =
  /^\s+(?:(?:is|are|was)\s+not|isn['’]t|aren['’]t|does\s+not|doesn['’]t|no\s+(?:es|son|está|están))(?![\p{L}\p{N}])/iu;

/** Where a clause ends, so that a denial in one does not cover a claim made in the next. */
const CLAUSE_BREAK = /[:;—–]|\b(?:but|however|yet|although|though|pero|sin embargo|aunque)\b/gi;

const SENTENCE_END = /(?<=[.!?…])\s+|\n+/;
const QUESTION = /[?¿]/;

/** The sentences of a text that say, without denying it, that a job will be lost. */
export function jobLossClaimsIn(text: string): string[] {
  return text
    .split(SENTENCE_END)
    .map((sentence) => sentence.trim())
    .filter(
      (sentence) =>
        !QUESTION.test(sentence) &&
        [...sentence.matchAll(PREDICTION)].some(
          (claim) =>
            !isDenied(
              sentence.slice(0, claim.index),
              sentence.slice(claim.index + claim[0].length),
            ),
        ),
    );
}

/** Whether what comes before a claim in its sentence, or right after it, denies it. */
function isDenied(before: string, after: string): boolean {
  if (DENIAL_BEFORE.test(before)) {
    return true;
  }
  const clause = before.split(CLAUSE_BREAK).at(-1) ?? '';
  if (CONDITION.test(clause.split(',').at(-1) ?? '')) {
    return true;
  }
  if (OPENS_CLAUSE.test(clause) && DENIAL_AFTER.test(after)) {
    return true;
  }
  return VERB_DENIAL.test(clause.replace(AFFIRMING, ' '));
}
