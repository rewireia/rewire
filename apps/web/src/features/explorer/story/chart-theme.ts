import type { AgCartesianChartOptions } from 'ag-charts-community';

import { useTokenColors } from '../../../components/use-token-color.ts';
import { MONO_FACE, TEXT_FACE } from '../../../theme/typefaces.ts';

/** The tokens the charts of the story are drawn with. */
const TOKENS = {
  surface: '--surface',
  ink: '--ink',
  ink2: '--ink-2',
  line: '--line',
  accent: '--accent',
  high: '--band-high',
  medium: '--band-medium',
  low: '--band-low',
  'very-low': '--band-very-low',
} as const;

export type StoryColors = Record<keyof typeof TOKENS, string>;

export function useStoryColors(): StoryColors {
  return useTokenColors(TOKENS);
}

/** What every chart of the story shares: the surface, no animation, the fonts and colours. */
export function baseOptions(colors: StoryColors, height: number) {
  return {
    background: { fill: colors.surface },
    animation: { enabled: false },
    legend: { enabled: false },
    height,
    padding: { top: 8, right: 16, bottom: 4, left: 4 },
  } satisfies Partial<AgCartesianChartOptions>;
}

/** An axis label in the mono face, in the secondary ink. */
export function axisLabel(colors: StoryColors) {
  return { color: colors.ink2, fontFamily: MONO_FACE, fontSize: 11 };
}

/** An axis title in the text face. */
export function axisTitle(colors: StoryColors, text: string) {
  return { enabled: true, text, color: colors.ink2, fontFamily: TEXT_FACE, fontSize: 12 };
}

/** A bar of the horizontal charts of the story: its label, its value from 0 to 100, its colour. */
interface StoryBar {
  readonly label: string;
  readonly value: number;
  readonly color: string;
  /** The full name in the tooltip, when the label is shortened. */
  readonly title?: string;
}

/** Horizontal bars on a scale from 0 to 100, the value written at the end of each bar. */
export function horizontalBars(
  colors: StoryColors,
  bars: readonly StoryBar[],
  axisText: string,
  unit: string,
): AgCartesianChartOptions<StoryBar> {
  return {
    ...baseOptions(colors, bars.length * 40 + 70),
    data: [...bars],
    series: [
      {
        type: 'bar',
        direction: 'horizontal',
        xKey: 'label',
        yKey: 'value',
        cornerRadius: 5,
        strokeWidth: 0,
        itemStyler: ({ datum }) => ({ fill: datum.color }),
        label: {
          enabled: true,
          placement: 'outside-end',
          color: colors.ink,
          formatter: ({ value }) => `${Math.round(Number(value))}${unit}`,
        },
        tooltip: {
          renderer: ({ datum }) => ({
            title: datum.title ?? datum.label,
            data: [{ label: '', value: `${Math.round(datum.value)}${unit}` }],
          }),
        },
      },
    ],
    axes: {
      y: {
        type: 'category',
        // A long name wraps onto two lines rather than running out of the canvas on a phone.
        label: { ...axisLabel(colors), color: colors.ink, maxWidth: 120, wrapping: 'on-space' },
        line: { enabled: false },
      },
      x: {
        type: 'number',
        min: 0,
        max: 100,
        interval: { values: [0, 25, 50, 75, 100] },
        label: axisLabel(colors),
        title: axisTitle(colors, axisText),
        gridLine: { style: [{ stroke: colors.line, lineDash: [] }] },
        line: { enabled: false },
      },
    },
  };
}
