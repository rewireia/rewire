import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { readSheetRecords } from '../pipeline/readers/spreadsheet.ts';

type Value = string | number | null;

const NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RELATIONSHIPS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_RELATIONSHIPS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const WORKSHEET_TYPE = `${RELATIONSHIPS}/worksheet`;
const CONTENT_TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types';
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const OFFICE_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
const WORKBOOK_TYPE = `${OFFICE_TYPE}.sheet.main+xml`;
const SHEET_TYPE = `${OFFICE_TYPE}.worksheet+xml`;
const RELS_TYPE = 'application/vnd.openxmlformats-package.relationships+xml';

/** The cell of a value: a number, an inline string, or nothing for an empty cell. */
function cellOf(value: Value, reference: string): string {
  if (value === null) {
    return '';
  }
  if (typeof value === 'number') {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${value}</t></is></c>`;
}

function sheetXml(rows: readonly (readonly Value[])[]): string {
  const body = rows
    .map((row, at) => {
      const cells = row.map((value, column) =>
        cellOf(value, `${String.fromCodePoint(65 + column)}${at + 1}`),
      );
      return `<row r="${at + 1}">${cells.join('')}</row>`;
    })
    .join('');
  return `${XML_DECLARATION}<worksheet xmlns="${NAMESPACE}"><sheetData>${body}</sheetData></worksheet>`;
}

/** A minimal .xlsx workbook with one sheet per entry, written in the test itself. */
function workbook(sheets: Readonly<Record<string, readonly (readonly Value[])[]>>): Uint8Array {
  const names = Object.keys(sheets);
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `${XML_DECLARATION}<Types xmlns="${CONTENT_TYPES}">` +
        `<Default Extension="rels" ContentType="${RELS_TYPE}"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="${WORKBOOK_TYPE}"/>` +
        names
          .map(
            (_, at) =>
              `<Override PartName="/xl/worksheets/sheet${at + 1}.xml" ContentType="${SHEET_TYPE}"/>`,
          )
          .join('') +
        `</Types>`,
    ),
    '_rels/.rels': strToU8(
      `${XML_DECLARATION}<Relationships xmlns="${PACKAGE_RELATIONSHIPS}">` +
        `<Relationship Id="rId1" Type="${RELATIONSHIPS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    'xl/workbook.xml': strToU8(
      `${XML_DECLARATION}<workbook xmlns="${NAMESPACE}" xmlns:r="${RELATIONSHIPS}"><sheets>` +
        names
          .map((name, at) => `<sheet name="${name}" sheetId="${at + 1}" r:id="rId${at + 1}"/>`)
          .join('') +
        `</sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `${XML_DECLARATION}<Relationships xmlns="${PACKAGE_RELATIONSHIPS}">` +
        names
          .map(
            (_, at) =>
              `<Relationship Id="rId${at + 1}" Type="${WORKSHEET_TYPE}" Target="worksheets/sheet${at + 1}.xml"/>`,
          )
          .join('') +
        `</Relationships>`,
    ),
  };
  Object.values(sheets).forEach((rows, at) => {
    files[`xl/worksheets/sheet${at + 1}.xml`] = strToU8(sheetXml(rows));
  });
  return zipSync(files);
}

const SCORES = [
  [' ISCO_08 ', 'Title', 'score_2025'],
  ['2512', 'Software developers', 0.605],
  ['4313', null, 0.8],
];

const NOTES_ABOVE = [
  ['Table 14.7a Annual pay, gross', null],
  ['Source: Annual Survey of Hours and Earnings', null],
  ['Description', 'Code'],
  ['Programmers and software development professionals', '2134'],
];

describe('readSheetRecords', () => {
  it('reads the first sheet as records keyed by the trimmed titles of its first row', async () => {
    const records = await readSheetRecords(workbook({ Scores: SCORES, Other: NOTES_ABOVE }));

    expect(records).toEqual([
      { ISCO_08: '2512', Title: 'Software developers', score_2025: 0.605 },
      { ISCO_08: '4313', Title: null, score_2025: 0.8 },
    ]);
  });

  it('reads a sheet by name and skips the rows above its header', async () => {
    const book = workbook({ Scores: SCORES, 'All employees': NOTES_ABOVE });

    expect(await readSheetRecords(book, 'All employees', 'Description')).toEqual([
      { Description: 'Programmers and software development professionals', Code: '2134' },
    ]);
  });

  it('fails when no row starts with the header it is told to look for', async () => {
    await expect(readSheetRecords(workbook({ Scores: SCORES }), 'Scores', 'Code')).rejects.toThrow(
      'no row starts with "Code"',
    );
  });
});
