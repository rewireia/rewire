import type { PayInsights } from '@rewire/contracts';
import {
  LogAxisModule,
  NumberAxisModule,
  ScatterSeriesModule,
  type AgCartesianChartOptions,
} from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import { toPoints } from '../../../i18n/format.ts';
import { useMessages } from '../../../i18n/use-messages.ts';

import {
  axisLabel,
  axisTitle,
  baseOptions,
  useStoryColors,
  type StoryColors,
} from './chart-theme.ts';
import { majorGroupName } from './major-groups.ts';
import { payTrend } from './story.ts';
import { StoryFigure } from './StoryFigure.tsx';
import { useStoryFormat } from './use-story-format.ts';

const MODULES = [ScatterSeriesModule, NumberAxisModule, LogAxisModule];
/** Below this many points, each one is larger and carries its name, on a linear pay axis. */
const FEW = 30;

interface PayDot {
  readonly title: string;
  readonly pay: number;
  readonly points: number;
}

interface PayWords {
  readonly payAxis: string;
  readonly scoreAxis: string;
  readonly money: (units: number) => string;
  readonly compact: (units: number) => string;
}

function payOptions(
  dots: readonly PayDot[],
  colors: StoryColors,
  words: PayWords,
): AgCartesianChartOptions<PayDot> {
  const few = dots.length < FEW;
  return {
    ...baseOptions(colors, 360),
    data: [...dots],
    series: [
      {
        type: 'scatter',
        xKey: 'pay',
        yKey: 'points',
        labelKey: 'title',
        label: { enabled: few, color: colors.ink2, fontSize: 11 },
        size: few ? 12 : 6,
        fill: colors.accent,
        fillOpacity: few ? 0.9 : 0.45,
        strokeWidth: 0,
        tooltip: {
          renderer: ({ datum }) => ({
            title: datum.title,
            data: [
              { label: words.payAxis, value: words.money(datum.pay) },
              { label: words.scoreAxis, value: `${datum.points} / 100` },
            ],
          }),
        },
      },
    ],
    axes: {
      x: {
        // Many occupations crowd the low pays: a log scale spreads them.
        type: few ? 'number' : 'log',
        position: 'bottom',
        label: { ...axisLabel(colors), formatter: ({ value }) => words.compact(Number(value)) },
        title: axisTitle(colors, words.payAxis),
        gridLine: { enabled: false },
        line: { stroke: colors.line },
      },
      y: {
        type: 'number',
        position: 'left',
        min: 0,
        max: 100,
        interval: { values: [0, 25, 50, 75, 100] },
        label: axisLabel(colors),
        title: axisTitle(colors, words.scoreAxis),
        gridLine: { style: [{ stroke: colors.line, lineDash: [] }] },
        line: { enabled: false },
      },
    },
  };
}

/** Pay against exposure, one point per occupation or group, and the two halves in words. */
export function PayChart({ pay }: { readonly pay: PayInsights }) {
  const { t, points } = useMessages();
  const format = useStoryFormat();
  const colors = useStoryColors();
  const options = useMemo(() => {
    const dots = pay.points.map((point) => ({
      title: pay.level === 'isco-1-digit' ? majorGroupName(t, point, true) : point.title,
      pay: point.pay,
      points: toPoints(point.meanScore),
    }));
    const axis = dots.length < FEW ? 'insights.pay.axis.pay' : 'insights.pay.axis.payLog';
    return payOptions(dots, colors, {
      payAxis: t(axis, { currency: pay.currency }),
      scoreAxis: t('insights.pay.axis.score'),
      money: (units) => format.money(pay.currency, units),
      compact: format.compact,
    });
  }, [pay, colors, t, format]);
  const body = t('insights.pay.body', {
    median: format.money(pay.currency, pay.split.medianPay),
    above: points(pay.split.above.meanScore),
    below: points(pay.split.below.meanScore),
  });
  const measure = t(`insights.pay.measure.${pay.measure}`);
  return (
    <StoryFigure
      wide
      title={t(`insights.pay.title.${payTrend(pay)}`)}
      caption={`${t('insights.pay.caption', { measure })} ${body}`}
      chart={<AgCharts options={options} modules={MODULES} />}
      lines={[body]}
      level={t(`insights.level.${pay.level}`)}
    />
  );
}
