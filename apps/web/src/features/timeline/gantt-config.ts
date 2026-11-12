import type { Model, Widget } from '@bryntum/core-community';
import type { GanttColumnConfig } from '@bryntum/gantt-community';
import type { BryntumGanttProps } from '@bryntum/gantt-react-community';
import type { PlannedCourse, Region } from '@rewire/contracts';

import type { Messages } from '../../i18n/use-messages.ts';

import { hoursCell, nameCell } from './gantt-cells.ts';
import type { GanttData } from './gantt-data.ts';

/** What the chart needs to read about the courses as it draws them. */
export interface ChartContext {
  readonly region: Region;
  readonly messages: Messages;
  readonly courses: ReadonlyMap<string, PlannedCourse>;
  readonly payments: GanttData['payments'];
  readonly stages: GanttData['stages'];
}

/** The width of the table beside the chart: the three columns below. */
export const TABLE_WIDTH = 340 + 68 + 88;

/** What a cell renderer may do to its row: Bryntum's `Row`, as far as the plan uses it. */
interface RowClasses {
  assignCls(classes: Record<string, boolean>): void;
}

/** The context is read when a row or a bar is drawn, so it always holds the latest plan. */
export type ContextSource = () => ChartContext;

/** The headers of the columns, in the language of the interface. */
export interface ColumnHeaders {
  readonly course: string;
  readonly hours: string;
  readonly inPlan: string;
}

function nameColumn(text: string, source: ContextSource): GanttColumnConfig {
  return {
    type: 'name',
    field: 'name',
    text,
    width: 340,
    editor: false,
    sortable: false,
    renderer: ({ record, row }: { record: Model; row: RowClasses | null }) => {
      const context = source();
      const id = String(record.id);
      row?.assignCls({
        'rewire-out': context.courses.get(id)?.booking === null,
        'rewire-stage-row': context.stages.has(id),
        [`rewire-row-${id}`]: context.stages.has(id),
        'rewire-payment-row': context.payments.has(id),
      });
      return nameCell(context, id, String(record.getData('name')));
    },
  };
}

function hoursColumn(text: string, source: ContextSource): GanttColumnConfig {
  return {
    id: 'hours',
    text,
    width: 68,
    align: 'end',
    editor: false,
    sortable: false,
    renderer: ({ record }: { record: Model }) => hoursCell(source(), String(record.id)),
  };
}

function inPlanColumn(
  text: string,
  source: ContextSource,
  onToggle: (courseId: string, inPlan: boolean) => void,
): GanttColumnConfig {
  return {
    type: 'check',
    field: 'inPlan',
    text,
    width: 88,
    align: 'center',
    sortable: false,
    // A stage is not a course: it has no box to tick. A widget column keeps `renderer` for its
    // own box and calls `afterRenderCell` after it.
    afterRenderCell: ({ record, widgets }: { record: Model; widgets?: Widget[] }) => {
      const box = widgets?.[0];
      if (box !== undefined) {
        box.hidden = !source().courses.has(String(record.id));
      }
    },
    // The box changes when the server answers, with the plan it saved.
    onBeforeToggle: ({ record, checked }: { record: Model; checked: boolean }) => {
      if (source().courses.has(String(record.id))) {
        onToggle(String(record.id), checked);
      }
      return false;
    },
  };
}

export function planColumns(
  headers: ColumnHeaders,
  source: ContextSource,
  onToggle: (courseId: string, inPlan: boolean) => void,
): GanttColumnConfig[] {
  return [
    nameColumn(headers.course, source),
    hoursColumn(headers.hours, source),
    inPlanColumn(headers.inPlan, source, onToggle),
  ];
}

/** Features of Bryntum Gantt Community that the plan uses, and the ones it turns off. */
export const PLAN_FEATURES = {
  cellEditFeature: true,
  taskDragFeature: { constrainDragToTimeline: true },
  // Only the end of a course is stretched: its start is where the plan puts it.
  taskResizeFeature: { leftHandle: false },
  dependenciesFeature: { allowCreate: false, showTooltip: false, enableDelete: false },
  taskDragCreateFeature: false,
  basicTaskEditFeature: false,
  taskMenuFeature: false,
  scheduleMenuFeature: false,
  cellMenuFeature: false,
  headerMenuFeature: false,
  timeAxisHeaderMenuFeature: false,
  columnReorderFeature: false,
  sortFeature: false,
  columnLinesFeature: true,
} satisfies BryntumGanttProps;
