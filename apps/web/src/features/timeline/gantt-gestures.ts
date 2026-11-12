import type { TaskModel } from '@bryntum/gantt-community';
import type { StudyPlan } from '@rewire/contracts';

import type { ChartContext } from './gantt-config.ts';
import { movedTo, stretchedTo, withCourse } from './plan-changes.ts';

/** What Bryntum's callbacks need when they run: the plan and texts of the last render. */
export interface Latest {
  readonly context: ChartContext;
  readonly plan: StudyPlan;
  readonly onChange: (plan: StudyPlan) => void;
}

/**
 * Bryntum reads its callbacks once, when the chart is made. They read the latest render through
 * this box, which the component writes after each render.
 */
export interface LatestBox {
  readonly read: () => Latest;
  readonly write: (latest: Latest) => void;
}

export function createLatestBox(first: Latest): LatestBox {
  let current = first;
  return {
    read: () => current,
    write: (latest) => {
      current = latest;
    },
  };
}

/** The gestures of the chart, each turned into a change of the plan. */
export function gestureListeners({ read }: LatestBox) {
  const change = (update: (plan: StudyPlan) => StudyPlan) => {
    const { plan, onChange } = read();
    onChange(update(plan));
  };
  return {
    onAfterTaskDrop: ({ taskRecords, valid }: { taskRecords: TaskModel[]; valid: boolean }) => {
      const [task] = taskRecords;
      const start = task?.startDate;
      if (valid && task !== undefined && start instanceof Date) {
        change((plan) => movedTo(plan, String(task.id), start));
      }
    },
    onTaskResizeEnd: ({ changed, taskRecord }: { changed: boolean; taskRecord: TaskModel }) => {
      const { startDate, endDate } = taskRecord;
      if (changed && startDate instanceof Date && endDate instanceof Date) {
        change((plan) => stretchedTo(plan, String(taskRecord.id), startDate, endDate));
      }
    },
    onToggle: (courseId: string, inPlan: boolean) => {
      change((plan) => withCourse(plan, courseId, inPlan));
    },
  };
}
