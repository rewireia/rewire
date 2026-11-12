import type { AgReportState } from 'ag-studio';

import type { Messages } from '../../../i18n/use-messages.ts';

import { FOCUS_WIDGET_TYPE } from './focus/focus-widget.ts';
import type { RewireRegistry } from './registry.ts';

type ReportState = AgReportState<RewireRegistry>;
type Page = ReportState['pages'][number];
type Widgets = NonNullable<Page['widgets']>;
type Widget = NonNullable<Widgets[string]>;
type Layout = NonNullable<Page['widgetLayout']>;

/** The pages of the shipped dashboard, in the order the switch offers them. */
export const PAGE_IDS = ['overview', 'groups'] as const;
export type PageId = (typeof PAGE_IDS)[number];

/** A field of a table, as a widget names it: `<table>.<field>`. */
const field = (id: string) => ({ id });
const measure = (id: string, aggregation: 'sum' | 'avg' | 'min' | 'max' | 'countd') => ({
  id,
  aggregation,
});
const OCCUPATIONS = measure('occupations.isco08', 'countd');
const LEVEL_ORDER = measure('occupations.levelOrder', 'min');

/** A widget's title. */
function frame(title: string) {
  return { title: { enabled: true, text: title } };
}

function figure(title: string, value: ReturnType<typeof measure>): Widget {
  return { type: 'value', dataMapping: { value: [value] }, format: frame(title) };
}

/** The whole width of the page, so that long official titles are read whole. */
function ranking(title: string, direction: 'asc' | 'desc'): Widget {
  const cols = ['isco08', 'title', 'exposure', 'level'].map((id) => field(`occupations.${id}`));
  return {
    type: 'grid',
    dataMapping: { cols },
    sort: [{ field: field('occupations.exposure'), direction }],
    format: { ...frame(title), style: { columnAutoSize: true } },
  };
}

function groupFilter(t: Messages['t']): Widget {
  return {
    type: 'list-filter',
    dataMapping: { value: [field('majorGroups.majorGroup')] },
    format: { title: { enabled: true, text: t('studio.widget.groups') } },
  };
}

function overviewWidgets(t: Messages['t']): Widgets {
  return {
    scored: figure(t('studio.kpi.scored'), OCCUPATIONS),
    mean: figure(t('studio.kpi.mean'), measure('occupations.exposure', 'avg')),
    high: figure(t('studio.kpi.high'), measure('occupations.highLevel', 'sum')),
    tasks: figure(t('studio.kpi.tasks'), measure('occupations.tasks', 'sum')),
    groups: groupFilter(t),
    byLevel: {
      type: 'column-chart-grouped',
      dataMapping: {
        categoryKey: [field('occupations.level')],
        valueKey: [OCCUPATIONS],
        // Carried so that the bars can follow the levels, from none to the highest.
        tooltipKey: [LEVEL_ORDER],
      },
      sort: [{ field: LEVEL_ORDER, direction: 'asc' }],
      format: frame(t('studio.widget.byLevel')),
    },
    focus: {
      type: FOCUS_WIDGET_TYPE,
      dataMapping: {
        occupation: [field('occupations.isco08')],
        rankBy: [measure('occupations.exposure', 'max')],
      },
      format: { title: { enabled: true, text: t('studio.focus.label') } },
    },
    byGroup: {
      type: 'bar-chart-grouped',
      dataMapping: {
        categoryKey: [field('majorGroups.majorGroup')],
        valueKey: [measure('occupations.exposure', 'avg')],
      },
      sort: [{ field: measure('occupations.exposure', 'avg'), direction: 'desc' }],
      format: frame(t('studio.widget.byGroup')),
    },
    most: ranking(t('studio.widget.most'), 'desc'),
    least: ranking(t('studio.widget.least'), 'asc'),
  };
}

/** Where each widget sits, on Studio's grid of 24 columns and 16 px rows. */
const OVERVIEW_LAYOUT: Layout = {
  scored: { xTrack: 0, yTrack: 0, xSpan: 6, ySpan: 7 },
  mean: { xTrack: 6, yTrack: 0, xSpan: 6, ySpan: 7 },
  high: { xTrack: 12, yTrack: 0, xSpan: 6, ySpan: 7 },
  tasks: { xTrack: 18, yTrack: 0, xSpan: 6, ySpan: 7 },
  groups: { xTrack: 0, yTrack: 7, xSpan: 6, ySpan: 26 },
  byLevel: { xTrack: 6, yTrack: 7, xSpan: 9, ySpan: 26 },
  focus: { xTrack: 15, yTrack: 7, xSpan: 9, ySpan: 26 },
  // The whole width, so that the long names of the major groups fit beside their bars.
  byGroup: { xTrack: 0, yTrack: 33, xSpan: 24, ySpan: 17 },
  most: { xTrack: 0, yTrack: 50, xSpan: 24, ySpan: 18 },
  least: { xTrack: 0, yTrack: 68, xSpan: 24, ySpan: 18 },
};

function groupsWidgets(t: Messages['t']): Widgets {
  return {
    groups: groupFilter(t),
    levelsByGroup: {
      type: 'bar-chart-stacked',
      dataMapping: {
        categoryKey: [field('majorGroups.majorGroup')],
        valueKey: [OCCUPATIONS],
        legendKey: [field('occupations.level')],
      },
      format: frame(t('studio.widget.levelsByGroup')),
    },
    table: {
      type: 'pivot-grid',
      dataMapping: {
        rows: [field('majorGroups.majorGroup')],
        columns: [field('occupations.level')],
        values: [OCCUPATIONS],
      },
      format: frame(t('studio.widget.groupTable')),
    },
  };
}

const GROUPS_LAYOUT: Layout = {
  groups: { xTrack: 0, yTrack: 0, xSpan: 6, ySpan: 26 },
  levelsByGroup: { xTrack: 6, yTrack: 0, xSpan: 18, ySpan: 26 },
  table: { xTrack: 0, yTrack: 26, xSpan: 24, ySpan: 22 },
};

function page(id: PageId, widgets: Widgets, widgetLayout: Layout): Page {
  // The level is offered as a page filter, set to every level.
  return { id, filter: { page: [{ field: field('occupations.level') }] }, widgets, widgetLayout };
}

/** The dashboard Rewire ships, in the language of the interface. */
export function defaultReport(t: Messages['t']): ReportState {
  return {
    selectedPageId: 'overview',
    pages: [
      page('overview', overviewWidgets(t), OVERVIEW_LAYOUT),
      page('groups', groupsWidgets(t), GROUPS_LAYOUT),
    ],
  };
}

/** Every field reference of a report, as `<table>.<field>`, to check them against the data. */
export function fieldsOf(report: ReportState): string[] {
  const ids = new Set<string>();
  const collect = (value: unknown, key?: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        collect(item);
      });
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([name, inner]) => {
        collect(inner, name);
      });
    } else if (key === 'id' && typeof value === 'string' && value.includes('.')) {
      ids.add(value);
    }
  };
  collect(report.pages.map(({ widgets, filter }) => ({ widgets, filter })));
  return [...ids];
}
