import { describe, expect, it } from 'vitest';

import { parseCsvRecords } from '../pipeline/readers/csv.ts';

const TABLE =
  'O*NET Id,Title\n15-1252.00,Software Developers\n13-2011.00,"Accountants, Auditors"\n';
const RECORDS = [
  { 'O*NET Id': '15-1252.00', Title: 'Software Developers' },
  { 'O*NET Id': '13-2011.00', Title: 'Accountants, Auditors' },
];

describe('parseCsvRecords', () => {
  it('keys each row by the column titles of the header line', () => {
    expect(parseCsvRecords(TABLE)).toEqual(RECORDS);
  });

  it('removes a byte order mark before the header', () => {
    expect(parseCsvRecords(`\uFEFF${TABLE}`)).toEqual(RECORDS);
  });

  it('skips empty lines', () => {
    expect(parseCsvRecords(TABLE.replace('\n13', '\n\n13'))).toEqual(RECORDS);
  });

  it('skips the notes above the line that starts with the named header', () => {
    const preamble = 'ESCO - O*NET crosswalk\nVersion 1, "September 2022"\n';

    expect(parseCsvRecords(`${preamble}${TABLE}`, 'O*NET Id,')).toEqual(RECORDS);
    expect(parseCsvRecords(`\uFEFF${preamble}${TABLE}`, 'O*NET Id,')).toEqual(RECORDS);
  });

  it('reads a table whose first line is already the named header', () => {
    expect(parseCsvRecords(TABLE, 'O*NET Id,')).toEqual(RECORDS);
  });

  it('fails when no line starts with the named header', () => {
    expect(() => parseCsvRecords('Notes only\nNo table here\n', 'O*NET Id,')).toThrow(
      'no line starts with "O*NET Id,"',
    );
  });
});
