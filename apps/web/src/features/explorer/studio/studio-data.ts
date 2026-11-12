import type { ExposureGradient, UnitGroupSummary } from '@rewire/contracts';
import type { AgDataSourcesDefinition, AgFieldDefinition } from 'ag-studio';

import type { Messages } from '../../../i18n/use-messages.ts';
import { toPoints } from '../../../i18n/format.ts';

import type { RewireRegistry } from './registry.ts';

/** The order of the levels, from no exposure to the highest, as the report ranks them. */
const LEVEL_ORDER: readonly ExposureGradient[] = [
  'not-exposed',
  'minimal',
  'gradient-1',
  'gradient-2',
  'gradient-3',
  'gradient-4',
];

/** The levels the dashboard counts as high, as the report's bands do. */
const HIGH_LEVELS: ReadonlySet<ExposureGradient> = new Set(['gradient-3', 'gradient-4']);

/** One occupation as a row of the dashboard's main table. */
export interface OccupationRow extends Readonly<Record<string, string | number>> {
  readonly isco08: string;
  readonly title: string;
  readonly majorGroupCode: string;
  /** The mean score in points from 0 to 100, as the explorer's table shows it. */
  readonly exposure: number;
  readonly level: string;
  readonly levelOrder: number;
  /** 1 when the level is high or very high, so that a sum counts them. */
  readonly highLevel: number;
  readonly tasks: number;
}

/** One ISCO-08 major group, the dimension the occupations are grouped by. */
export interface MajorGroupRow extends Readonly<Record<string, string>> {
  readonly code: string;
  readonly majorGroup: string;
}

export function occupationRows(
  unitGroups: readonly UnitGroupSummary[],
  t: Messages['t'],
): OccupationRow[] {
  return unitGroups.map((group) => ({
    isco08: group.isco08,
    title: group.title,
    majorGroupCode: group.majorGroup.code,
    exposure: toPoints(group.meanScore),
    level: t(`gradient.${group.gradient}`),
    levelOrder: LEVEL_ORDER.indexOf(group.gradient) + 1,
    highLevel: HIGH_LEVELS.has(group.gradient) ? 1 : 0,
    tasks: group.tasks,
  }));
}

/** The major groups found in the list, each once, in code order. */
export function majorGroupRows(unitGroups: readonly UnitGroupSummary[]): MajorGroupRow[] {
  const groups = new Map(unitGroups.map((group) => [group.majorGroup.code, group.majorGroup]));
  return [...groups.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((group) => ({ code: group.code, majorGroup: `${group.code} · ${group.title}` }));
}

type Fields = AgFieldDefinition<RewireRegistry>[];

/** The columns of the occupations table, named as the explorer's table names them. */
function occupationFields(t: Messages['t'], whole: { readonly format: Intl.NumberFormat }): Fields {
  return [
    { id: 'isco08', name: t('explore.col.code'), format: 'textFormat' },
    { id: 'title', name: t('explore.col.title'), format: 'textFormat' },
    { id: 'majorGroupCode', format: 'textFormat', hide: true },
    {
      id: 'exposure',
      name: t('explore.col.exposure'),
      description: t('studio.field.exposure.description'),
      format: 'decimalFormat',
      formatOptions: whole,
    },
    { id: 'level', name: t('explore.col.level'), format: 'textFormat', cardinality: 'low' },
    {
      id: 'levelOrder',
      name: t('studio.field.levelOrder'),
      format: 'integerFormat',
      hide: true,
    },
    {
      id: 'highLevel',
      name: t('studio.field.highLevel'),
      format: 'integerFormat',
      formatOptions: whole,
    },
    {
      id: 'tasks',
      name: t('explore.col.tasks'),
      format: 'integerFormat',
      formatOptions: whole,
    },
  ];
}

/** The two tables Studio reads, joined on the major group code. Every value comes from the API. */
export function studioDataOf(
  unitGroups: readonly UnitGroupSummary[],
  { t, language }: Pick<Messages, 't' | 'language'>,
): AgDataSourcesDefinition<RewireRegistry> {
  const whole = { format: new Intl.NumberFormat(language, { maximumFractionDigits: 0 }) };
  return {
    sources: [
      {
        id: 'occupations',
        name: t('studio.table.occupations'),
        description: t('studio.table.occupations.description'),
        primaryKeyField: 'isco08',
        data: occupationRows(unitGroups, t),
        fields: occupationFields(t, whole),
      },
      {
        id: 'majorGroups',
        name: t('studio.table.majorGroups'),
        description: t('studio.table.majorGroups.description'),
        primaryKeyField: 'code',
        data: majorGroupRows(unitGroups),
        fields: [
          { id: 'code', format: 'textFormat', hide: true },
          { id: 'majorGroup', name: t('explore.col.majorGroup'), format: 'textFormat' },
        ],
      },
    ],
    relationships: [
      {
        id: 'occupationMajorGroup',
        type: 'many-to-one',
        source: 'occupations.majorGroupCode',
        target: 'majorGroups.code',
      },
    ],
  };
}
