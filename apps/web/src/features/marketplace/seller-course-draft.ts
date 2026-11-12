import {
  sellerCourseInputSchema,
  type Region,
  type SellerCourse,
  type SellerCourseInput,
} from '@rewire/contracts';

/** What the seller is typing: every field as the form holds it. */
export interface CourseDraft {
  readonly title: string;
  readonly summary: string;
  readonly level: SellerCourseInput['level'];
  readonly hours: string;
  readonly language: SellerCourseInput['language'];
  readonly topics: readonly string[];
  readonly accessUrl: string;
  readonly price: string;
}

export type DraftField = 'title' | 'summary' | 'hours' | 'topics' | 'accessUrl' | 'price';

export const EMPTY_DRAFT: CourseDraft = {
  title: '',
  summary: '',
  level: 'introductory',
  hours: '',
  language: 'en',
  topics: [],
  accessUrl: 'https://',
  price: '',
};

/** The draft of a course the seller already published, to edit it. */
export function draftOf(course: SellerCourse): CourseDraft {
  return {
    title: course.title,
    summary: course.summary,
    level: course.level,
    hours: String(course.hours),
    language: course.language === 'es' ? 'es' : 'en',
    topics: course.topics,
    accessUrl: course.accessUrl,
    price: String(course.price.minorUnits / 100),
  };
}

const FIELDS: ReadonlySet<string> = new Set<DraftField>([
  'title',
  'summary',
  'hours',
  'topics',
  'accessUrl',
  'price',
]);

/**
 * The course the server will be sent, or the fields that are not right yet, checked with the
 * same schema the server applies.
 */
export function readDraft(
  draft: CourseDraft,
  region: Region,
  published: boolean,
): { course: SellerCourseInput; errors: [] } | { course: null; errors: DraftField[] } {
  const priceMinor = Math.round(Number(draft.price) * 100);
  const parsed = sellerCourseInputSchema.safeParse({
    region,
    title: draft.title,
    summary: draft.summary,
    level: draft.level,
    hours: draft.hours.trim() === '' ? Number.NaN : Number(draft.hours),
    language: draft.language,
    topics: draft.topics,
    accessUrl: draft.accessUrl.trim(),
    priceMinor: draft.price.trim() === '' ? Number.NaN : priceMinor,
    published,
  });
  if (parsed.success) return { course: parsed.data, errors: [] };
  const fields = parsed.error.issues.map((issue) =>
    issue.path[0] === 'priceMinor' ? 'price' : String(issue.path[0]),
  );
  return {
    course: null,
    errors: [...new Set(fields)].filter((field): field is DraftField => FIELDS.has(field)),
  };
}

/** The fields in the order the form shows them: the first wrong one takes the focus. */
const FIELD_ORDER: readonly DraftField[] = [
  'title',
  'summary',
  'topics',
  'hours',
  'price',
  'accessUrl',
];

/** The first field, in the form's order, that is not right yet. */
export function firstInvalid(errors: readonly DraftField[]): DraftField | undefined {
  return FIELD_ORDER.find((field) => errors.includes(field));
}

/**
 * The errors the form shows: only those of fields the person has left, or of every field once
 * they asked to publish or save. A form just opened shows none.
 */
export function visibleErrors(
  errors: readonly DraftField[],
  touched: ReadonlySet<DraftField>,
): ReadonlySet<DraftField> {
  return new Set(errors.filter((field) => touched.has(field)));
}
