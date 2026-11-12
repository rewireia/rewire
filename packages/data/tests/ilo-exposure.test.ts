import { describe, expect, it } from 'vitest';

import type { SheetRecord } from '../pipeline/readers/spreadsheet.ts';
import { buildExposure } from '../pipeline/steps/ilo-exposure.ts';

/** One row of the ILO workbook: a task of Software developers unless overridden. */
function taskRow(overrides: Readonly<Record<string, SheetRecord[string]>> = {}): SheetRecord {
  return {
    ISCO_08: '2512',
    Title: ' Software developers ',
    label1d: '2 - Professionals',
    taskID: 1,
    Task_ISCO: ' Writing and maintaining program code; ',
    predicted_score_2025_gpt4o: 0.56,
    prediction_justification_gpt4o: 'Code can be drafted by a model.',
    predicted_score_2025_gemini: 0.65,
    prediction_justification_gemini: null,
    score_2025: 0.605,
    source: 'predicted',
    mean_score_2025: 0.53,
    SD_2025: 0.07,
    potential25: 'Exposed: Gradient 3',
    ...overrides,
  };
}

describe('buildExposure', () => {
  it('groups the task rows by unit group, in the order the groups first appear', () => {
    const { dataset } = buildExposure([
      taskRow({ taskID: 1 }),
      taskRow({
        ISCO_08: '4313',
        Title: 'Payroll clerks',
        label1d: '4 - Clerical support workers',
      }),
      taskRow({ taskID: 2 }),
    ]);

    expect(dataset.occupations.map((occupation) => occupation.isco08)).toEqual(['2512', '4313']);
    expect(dataset.occupations[0]?.tasks.map((task) => task.id)).toEqual(['2512-1', '2512-2']);
  });

  it('orders the tasks of a unit group by task number, not as text', () => {
    const { dataset } = buildExposure([10, 2, 1].map((taskID) => taskRow({ taskID })));

    expect(dataset.occupations[0]?.tasks.map((task) => task.id)).toEqual([
      '2512-1',
      '2512-2',
      '2512-10',
    ]);
  });

  it('copies the occupation figures from the source and trims its texts', () => {
    const { dataset } = buildExposure([taskRow()]);

    expect(dataset.occupations).toEqual([
      {
        isco08: '2512',
        title: 'Software developers',
        majorGroup: '2',
        meanScore: 0.53,
        standardDeviation: 0.07,
        gradient: 'gradient-3',
        tasks: [
          {
            id: '2512-1',
            text: 'Writing and maintaining program code;',
            score: 0.605,
            modelScores: { gpt4o: 0.56, gemini: 0.65 },
            origin: 'predicted',
          },
        ],
      },
    ]);
  });

  it('reads a unit group code stored as a number', () => {
    const { dataset } = buildExposure([taskRow({ ISCO_08: 2512 })]);

    expect(dataset.occupations[0]?.isco08).toBe('2512');
  });

  it('restores the leading zeros of a unit group code stored as a number', () => {
    const { dataset } = buildExposure([taskRow({ ISCO_08: 110, label1d: '0 - Armed forces' })]);

    expect(dataset.occupations[0]).toMatchObject({ isco08: '0110', majorGroup: '0' });
    expect(dataset.occupations[0]?.tasks[0]?.id).toBe('0110-1');
  });

  it('translates every gradient label of the ILO', () => {
    const labels = {
      'Exposed: Gradient 4': 'gradient-4',
      'Exposed: Gradient 3': 'gradient-3',
      'Exposed: Gradient 2': 'gradient-2',
      'Exposed: Gradient 1': 'gradient-1',
      'Minimal Exposure': 'minimal',
      'Not Exposed': 'not-exposed',
    };
    for (const [label, gradient] of Object.entries(labels)) {
      const { dataset } = buildExposure([taskRow({ potential25: label })]);
      expect(dataset.occupations[0]?.gradient).toBe(gradient);
    }
  });

  it('keeps the reasoning of both models, keyed by task id', () => {
    const { rationales } = buildExposure([taskRow({ taskID: 3 })]);

    expect(rationales).toEqual({
      '2512-3': { gpt4o: 'Code can be drafted by a model.', gemini: null },
    });
  });

  it('lists each major group once, in code order', () => {
    const { dataset } = buildExposure([
      taskRow({ ISCO_08: '4313', label1d: '4 - Clerical support workers' }),
      taskRow(),
      taskRow({ ISCO_08: '2411', label1d: '2 - Professionals' }),
    ]);

    expect(dataset.majorGroups).toEqual([
      { code: '2', title: 'Professionals' },
      { code: '4', title: 'Clerical support workers' },
    ]);
  });

  it.each([
    ['Title', 'Software engineers'],
    ['mean_score_2025', 0.54],
    ['SD_2025', 0.08],
    ['potential25', 'Exposed: Gradient 2'],
  ])('rejects task rows of one unit group that disagree on %s', (column, value) => {
    const rows = [taskRow({ taskID: 1 }), taskRow({ taskID: 2, [column]: value })];

    expect(() => buildExposure(rows)).toThrow(
      `unit group 2512 has task rows that disagree on ${column}`,
    );
  });

  it('rejects a row that breaks the shape of the workbook', () => {
    const invalidRows = [
      { score_2025: 1.2 },
      { predicted_score_2025_gpt4o: -0.1 },
      { ISCO_08: '251' },
      { ISCO_08: 25_120 },
      { ISCO_08: 2512.5 },
      { taskID: 0 },
      { source: 'estimated' },
      { potential25: 'Exposed: Gradient 5' },
      { label1d: 'Professionals' },
    ];
    for (const overrides of invalidRows) {
      expect(() => buildExposure([taskRow(), taskRow(overrides)])).toThrow();
    }
  });
});
