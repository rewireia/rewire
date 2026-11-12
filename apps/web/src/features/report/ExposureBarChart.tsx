import {
  BarSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  type AgCartesianChartOptions,
} from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import { useTokenColors } from '../../components/use-token-color.ts';

const MODULES = [BarSeriesModule, CategoryAxisModule, NumberAxisModule];
const TOKENS = {
  surface: '--surface',
  ink: '--ink-2',
  accent: '--accent',
  high: '--band-high',
  medium: '--band-medium',
  low: '--band-low',
  'very-low': '--band-very-low',
} as const;

export interface ExposureBarRow {
  readonly label: string;
  readonly detail?: string;
  readonly score: number;
  readonly color: keyof typeof TOKENS;
}

/** A horizontal score chart, with the text equivalent supplied by its caller. */
export function ExposureBarChart({ rows }: { readonly rows: readonly ExposureBarRow[] }) {
  const colors = useTokenColors(TOKENS);
  const options = useMemo<AgCartesianChartOptions<ExposureBarRow>>(
    () => ({
      data: [...rows],
      background: { fill: colors.surface },
      animation: { enabled: false },
      height: Math.max(110, rows.length * 42 + 36),
      padding: { top: 4, right: 8, bottom: 4, left: 4 },
      legend: { enabled: false },
      series: [
        {
          type: 'bar',
          direction: 'horizontal',
          xKey: 'label',
          yKey: 'score',
          strokeWidth: 0,
          cornerRadius: 5,
          itemStyler: ({ datum }) => ({ fill: colors[datum.color] }),
          tooltip: {
            enabled: true,
            renderer: ({ datum }) => ({
              title: datum.detail ?? datum.label,
              data: [{ label: '', value: `${datum.score} / 100` }],
            }),
          },
        },
      ],
      axes: {
        y: { type: 'category', label: { color: colors.ink }, line: { enabled: false } },
        x: {
          type: 'number',
          min: 0,
          max: 100,
          interval: { values: [0, 25, 50, 75, 100] },
          label: { color: colors.ink },
          line: { enabled: false },
          gridLine: { enabled: false },
        },
      },
    }),
    [rows, colors],
  );
  return (
    <div aria-hidden="true">
      <AgCharts options={options} modules={MODULES} />
    </div>
  );
}
