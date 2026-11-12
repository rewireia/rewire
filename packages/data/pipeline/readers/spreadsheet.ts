import { readSheet } from 'read-excel-file/node';

/** A cell as the pipeline reads it. Dates never occur in the sources we use. */
export type Cell = string | number | boolean | null;

/** A row keyed by the column titles of the first row of its sheet. */
export type SheetRecord = Readonly<Record<string, Cell>>;

/**
 * Reads one sheet of an .xlsx workbook as records. Without a name, the first sheet.
 *
 * Some publishers put a title and notes above the table. `headerStartsWith` names the first
 * column title, and every row before the one that starts with it is skipped.
 */
export async function readSheetRecords(
  workbook: Uint8Array,
  sheet?: string,
  headerStartsWith?: string,
): Promise<SheetRecord[]> {
  const input = Buffer.from(workbook);
  const rows = sheet === undefined ? await readSheet(input) : await readSheet(input, sheet);
  const start =
    headerStartsWith === undefined
      ? 0
      : rows.findIndex((row) => String(row[0] ?? '').trim() === headerStartsWith);
  if (start === -1) {
    throw new Error(`no row starts with "${headerStartsWith ?? ''}"`);
  }
  const [header, ...body] = rows.slice(start);
  if (header === undefined) {
    return [];
  }
  const columns = header.map((title) => String(title).trim());
  return body.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, toCell(row[index])])),
  );
}

function toCell(value: unknown): Cell {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
}
