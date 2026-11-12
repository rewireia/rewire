import type { EmploymentSeries, LabourContext, PaySeries } from '@rewire/data';

import { labourFigureFor, type LabourFigure, type OccupationKeys } from './figure.ts';

/** Employment in an occupation, and whether people or jobs are counted. */
export interface EmploymentFigure extends LabourFigure {
  readonly counts: EmploymentSeries['counts'];
}

/** What an occupation earns, with the currency and the statistic of the figure. */
export interface PayFigure extends LabourFigure {
  readonly currency: PaySeries['currency'];
  readonly measure: PaySeries['measure'];
}

/** The labour market around one occupation. A figure no source publishes is absent. */
export interface OccupationLabour {
  readonly employment?: EmploymentFigure;
  readonly pay?: PayFigure;
}

/** Employment and pay for an occupation, from the labour context of its region. */
export function occupationLabourOf(context: LabourContext, keys: OccupationKeys): OccupationLabour {
  const employment = employmentOf(context.employment, keys);
  const pay = payOf(context.pay, keys);
  return {
    ...(employment === undefined ? {} : { employment }),
    ...(pay === undefined ? {} : { pay }),
  };
}

function employmentOf(
  series: EmploymentSeries | undefined,
  keys: OccupationKeys,
): EmploymentFigure | undefined {
  if (series === undefined) {
    return undefined;
  }
  const figure = labourFigureFor(series, keys);
  return figure === undefined ? undefined : { ...figure, counts: series.counts };
}

function payOf(series: PaySeries | undefined, keys: OccupationKeys): PayFigure | undefined {
  if (series === undefined) {
    return undefined;
  }
  const figure = labourFigureFor(series, keys);
  return figure === undefined
    ? undefined
    : { ...figure, currency: series.currency, measure: series.measure };
}
