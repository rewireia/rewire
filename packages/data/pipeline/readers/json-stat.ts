import { z } from 'zod';

/** A category list: code → position, or the codes in order. */
const categoryIndexSchema = z.union([z.record(z.string(), z.number().int()), z.array(z.string())]);

/** A sparse list keyed by position, or a dense one. */
const sparseSchema = <T extends z.ZodType>(item: T) =>
  z.union([z.record(z.string(), item), z.array(item.nullable())]);

const jsonStatSchema = z.object({
  id: z.array(z.string()).min(1),
  size: z.array(z.number().int().nonnegative()).min(1),
  value: sparseSchema(z.number()),
  status: sparseSchema(z.string()).optional(),
  dimension: z.record(
    z.string(),
    z.object({
      category: z.object({
        index: categoryIndexSchema,
        label: z.record(z.string(), z.string()).optional(),
      }),
    }),
  ),
});

/** What a dataset read along one dimension holds. */
export interface JsonStatTable {
  /** The single category every other dimension was fixed to, by dimension. */
  readonly fixed: Readonly<Record<string, string>>;
  readonly observations: readonly JsonStatObservation[];
}

/** One category of the dimension a table is read along, with what it holds. */
export interface JsonStatObservation {
  readonly code: string;
  readonly label: string;
  /** Absent when the publisher has no figure for the category. */
  readonly value: number | undefined;
  /** The publisher's flag on the figure, such as `e` (estimated) or `u` (low reliability). */
  readonly status: string | undefined;
}

/**
 * Reads a JSON-stat 2.0 dataset along one dimension, in category order.
 *
 * Every other dimension must have been fixed by the query to a single category, so each
 * category of `along` names exactly one figure.
 */
export function readJsonStat(json: unknown, along: string): JsonStatTable {
  const dataset = jsonStatSchema.parse(json);
  if (dataset.id.length !== dataset.size.length) {
    throw new Error('the JSON-stat dataset has a different number of dimensions and sizes');
  }
  const position = dataset.id.indexOf(along);
  const others = dataset.size.filter((size, index) => index !== position && size !== 1);
  if (position === -1 || others.length > 0) {
    throw new Error(`the JSON-stat dataset does not vary along ${along} alone`);
  }
  const { label } = dimensionOf(dataset, along).category;
  const fixed = Object.fromEntries(
    dataset.id
      .filter((id) => id !== along)
      .map((id) => [id, codesOf(dataset, id)[0] ?? ''] as const),
  );
  // With every other dimension of size 1, the position of a figure is that of its category.
  const observations = codesOf(dataset, along).map((code, offset) => ({
    code,
    label: label?.[code] ?? code,
    value: at(dataset.value, offset),
    status: at(dataset.status, offset),
  }));
  return { fixed, observations };
}

/** The codes of a dimension in the order of its positions. */
function codesOf(dataset: z.infer<typeof jsonStatSchema>, id: string): string[] {
  const { index } = dimensionOf(dataset, id).category;
  return Array.isArray(index)
    ? index
    : Object.entries(index)
        .toSorted(([, a], [, b]) => a - b)
        .map(([code]) => code);
}

function dimensionOf(dataset: z.infer<typeof jsonStatSchema>, id: string) {
  const dimension = dataset.dimension[id];
  if (dimension === undefined) {
    throw new Error(`the JSON-stat dataset does not describe its dimension ${id}`);
  }
  return dimension;
}

function at<T>(list: Record<string, T> | (T | null)[] | undefined, offset: number): T | undefined {
  if (list === undefined) {
    return undefined;
  }
  return (Array.isArray(list) ? list[offset] : list[String(offset)]) ?? undefined;
}
