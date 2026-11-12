import type { AgFilterDefinition } from 'ag-studio';

const ISCO08 = /^\d{4}$/;

interface Condition {
  readonly field: string;
  readonly value: unknown;
}

/** The single conditions of a filter, with the field each one names. */
function conditionsOf(filter: AgFilterDefinition | undefined): Condition[] {
  if (filter === undefined) {
    return [];
  }
  if ('conditions' in filter) {
    return filter.conditions.flatMap(conditionsOf);
  }
  return [{ field: filter.field.id, value: filter.value }];
}

/** The occupation a right-clicked row or bar is about, when it names one. */
export function occupationOf(filter: AgFilterDefinition | undefined): string | undefined {
  const values = conditionsOf(filter).flatMap(({ field, value }) =>
    field === 'occupations.isco08' ? [value] : [],
  );
  const [first] = values.flat();
  return typeof first === 'string' && ISCO08.test(first) ? first : undefined;
}

/** What a drill-through keeps, in words: the values of its conditions. */
export function describeFilter(filter: AgFilterDefinition): string {
  return conditionsOf(filter)
    .flatMap(({ value }): unknown[] => (Array.isArray(value) ? (value as unknown[]) : [value]))
    .filter(
      (value): value is string | number => typeof value === 'string' || typeof value === 'number',
    )
    .join(' · ');
}
