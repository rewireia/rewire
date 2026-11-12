import type { Currency, MarketSale } from '@rewire/contracts';
import {
  BarSeriesModule,
  CategoryAxisModule,
  LegendModule,
  NumberAxisModule,
  type AgBarSeriesOptions,
  type AgCartesianChartOptions,
} from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import { useTokenColors } from '../../components/use-token-color.ts';
import { formatDay, formatMoney } from '../../i18n/format.ts';
import { useMessages, type Messages } from '../../i18n/use-messages.ts';
import { MONO_FACE } from '../../theme/typefaces.ts';

import { salesByDay } from './business-figures.ts';

const MODULES = [BarSeriesModule, CategoryAxisModule, NumberAxisModule, LegendModule];
const TOKENS = {
  ink2: '--ink-2',
  line: '--line',
  done: '--done',
  error: '--error',
  surface: '--surface',
} as const;
type Colors = Readonly<Record<keyof typeof TOKENS, string>>;

interface Bar {
  readonly label: string;
  readonly kept: number;
  readonly refunded: number;
}

/** One stacked column series, with its amount in the currency's own format in its tooltip. */
function barSeries(
  yKey: 'kept' | 'refunded',
  name: string,
  fill: string,
  money: (major: number) => string,
): AgBarSeriesOptions<Bar> {
  return {
    type: 'bar',
    xKey: 'label',
    yKey,
    yName: name,
    stacked: true,
    fill,
    cornerRadius: 3,
    tooltip: {
      renderer: ({ datum }) => ({
        title: datum.label,
        data: [{ label: name, value: money(datum[yKey]) }],
      }),
    },
  };
}

function chartOptions(
  sales: readonly MarketSale[],
  currency: Currency,
  colors: Colors,
  { t, language }: Messages,
): AgCartesianChartOptions<Bar> {
  const money = (major: number) =>
    formatMoney({ currency, minorUnits: Math.round(major * 100) }, language);
  const label = { color: colors.ink2, fontFamily: MONO_FACE, fontSize: 11 };
  return {
    data: salesByDay(sales, currency).map((day) => ({
      label: formatDay(`${day.day}T12:00:00Z`, language),
      kept: day.keptMinor / 100,
      refunded: day.refundedMinor / 100,
    })),
    background: { fill: colors.surface },
    animation: { enabled: false },
    height: 240,
    padding: { top: 12, right: 8, bottom: 4, left: 4 },
    legend: { position: 'bottom', item: { label } },
    series: [
      barSeries('kept', t('business.chart.kept'), colors.done, money),
      barSeries('refunded', t('business.chart.refunded'), colors.error, money),
    ],
    axes: {
      x: { type: 'category', label, line: { stroke: colors.line } },
      y: {
        type: 'number',
        min: 0,
        label: { ...label, formatter: ({ value }: { value: number }) => money(value) },
        gridLine: { style: [{ stroke: colors.line, lineDash: [] }] },
      },
    },
  };
}

/**
 * What each day sold in one currency, in stacked columns: what the seller kept and what went
 * back. Drawn once, without animation; each column says its amounts in its tooltip.
 */
export function SalesChart({
  sales,
  currency,
}: {
  readonly sales: readonly MarketSale[];
  readonly currency: Currency;
}) {
  const messages = useMessages();
  const colors = useTokenColors(TOKENS);
  const options = useMemo(
    () => chartOptions(sales, currency, colors, messages),
    [sales, currency, colors, messages],
  );
  return <AgCharts options={options} modules={MODULES} />;
}
