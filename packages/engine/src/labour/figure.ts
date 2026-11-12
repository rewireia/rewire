import type { LabourLevel, LabourSeries } from '@rewire/data';

/** What identifies an occupation to a labour series: its regional code and its unit group. */
export interface OccupationKeys {
  /**
   * Code in the regional classification: ESCO code, O*NET-SOC code or SOC 2020 unit group.
   * Missing when only the unit group is known, as for a report opened from the list of groups.
   */
  readonly occupationCode?: string | undefined;
  /** The ISCO-08 unit group the occupation is bridged to, when it is. */
  readonly isco08?: string | undefined;
}

/** One figure of a series, with what is needed to say honestly what it describes. */
export interface LabourFigure {
  readonly value: number;
  readonly level: LabourLevel;
  readonly period: string;
  /** Id of the source in the bundle manifest. */
  readonly source: string;
  readonly population: string;
  /** The code the figure is published for: the occupation's own, or the ISCO-08 group around it. */
  readonly groupCode: string;
  /** Title of that group, when the series gives one. */
  readonly groupTitle?: string;
}

/** An O*NET-SOC code: the SOC occupation and a two-digit O*NET suffix, as in `15-1252.00`. */
const ONET_SOC_CODE = /^(\d{2}-\d{4})\.\d{2}$/;

/** An ISCO-08 unit group code: four digits. */
const ISCO_UNIT_GROUP_CODE = /^\d{4}$/;

const ISCO_DIGITS = { 'isco-2-digit': 2, 'isco-1-digit': 1 } as const;

/**
 * The figure a series publishes for an occupation, or `undefined` when it publishes none.
 *
 * An occupation is looked up at the level of the series: by its own code, or by the ISCO-08
 * group its unit group belongs to. An occupation without a unit group has no ISCO-08 group,
 * so it gets no figure from a series published by ISCO-08 group.
 */
export function labourFigureFor(
  series: LabourSeries,
  keys: OccupationKeys,
): LabourFigure | undefined {
  const groupCode = groupCodeOf(series.level, keys);
  const value = groupCode === undefined ? undefined : series.byCode[groupCode];
  if (groupCode === undefined || value === undefined) {
    return undefined;
  }
  const groupTitle = series.titles?.[groupCode];
  return {
    value,
    level: series.level,
    period: series.period,
    source: series.source,
    population: series.population,
    groupCode,
    ...(groupTitle === undefined ? {} : { groupTitle }),
  };
}

function groupCodeOf(level: LabourLevel, keys: OccupationKeys): string | undefined {
  if (level === 'regional-occupation') {
    const { occupationCode } = keys;
    // O*NET splits some SOC occupations further; the statistics are published for the SOC one.
    return occupationCode === undefined
      ? undefined
      : (ONET_SOC_CODE.exec(occupationCode)?.[1] ?? occupationCode);
  }
  const digits = ISCO_DIGITS[level];
  const { isco08 } = keys;
  return isco08 !== undefined && ISCO_UNIT_GROUP_CODE.test(isco08)
    ? isco08.slice(0, digits)
    : undefined;
}
