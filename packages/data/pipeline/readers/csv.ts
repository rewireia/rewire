import { parse } from 'csv-parse/sync';

/** A row keyed by the column titles of the header line. */
export type CsvRecord = Readonly<Record<string, string>>;

/**
 * Parses CSV text as records.
 *
 * Some publishers put notes above the table. `headerStartsWith` names the first column
 * title, and everything before that line is skipped.
 */
export function parseCsvRecords(text: string, headerStartsWith?: string): CsvRecord[] {
  const withoutBom = text.replace(/^\uFEFF/, '');
  const table =
    headerStartsWith === undefined ? withoutBom : tableFrom(withoutBom, headerStartsWith);
  return parse(table, { columns: true, skip_empty_lines: true });
}

/** The text from the first line that starts with the header on. */
function tableFrom(text: string, headerStartsWith: string): string {
  const lines = text.split('\n');
  const header = lines.findIndex((line) => line.startsWith(headerStartsWith));
  if (header === -1) {
    throw new Error(`no line starts with "${headerStartsWith}"`);
  }
  return lines.slice(header).join('\n');
}
