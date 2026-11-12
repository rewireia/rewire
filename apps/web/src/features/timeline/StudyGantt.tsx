// Bryntum's icons, served with the app: without them it would fetch them from a CDN.
import '@bryntum/core-community/fontawesome/css/fontawesome.css';
import '@bryntum/core-community/fontawesome/css/solid.css';
import '@bryntum/gantt-community/gantt.css';
import '@bryntum/gantt-community/svalbard.css';
import './gantt-theme.css';

import { BryntumGantt, type BryntumGanttProps } from '@bryntum/gantt-react-community';
import type { PathwayStage, Region, StudyPlan, StudyTimeline } from '@rewire/contracts';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from 'react';
import { useNavigate } from 'react-router';

import { useMessages } from '../../i18n/use-messages.ts';

import { barContent } from './gantt-bars.ts';
import { planColumns, PLAN_FEATURES, TABLE_WIDTH, type ChartContext } from './gantt-config.ts';
import { toGanttData } from './gantt-data.ts';
import { createLatestBox, gestureListeners, type LatestBox } from './gantt-gestures.ts';
import { applyGanttLocale } from './gantt-locale.ts';
import { weekWidth, type ChartScale } from './gantt-scale.ts';
import { weekHeader } from './gantt-today.ts';
import { tooltipHtml } from './gantt-tooltip.ts';
import { paymentName } from './payment.ts';
import { useWidth } from './use-width.ts';

/** The plan as the server last laid it out; a new revision draws it again even if unchanged. */
export interface TimelineSnapshot {
  readonly timeline: StudyTimeline;
  readonly revision: number;
}

interface StudyGanttProps {
  readonly region: Region;
  readonly snapshot: TimelineSnapshot;
  /** While a change is saved, the chart takes no other. */
  readonly busy: boolean;
  readonly onChange: (plan: StudyPlan) => void;
  readonly scale: ChartScale;
  /** A course picked on the chart, by a click on its bar. */
  readonly onSelect?: ((courseId: string) => void) | undefined;
}

/** Sends a link to a page of Rewire through the router, like any other link of the app. */
function useInternalLinks() {
  const navigate = useNavigate();
  return (event: MouseEvent<HTMLDivElement>) => {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (event.button !== 0 || modified || link?.dataset.route !== 'internal') {
      return;
    }
    event.preventDefault();
    void navigate(link.getAttribute('href') ?? '/');
  };
}

/** "Your plan in time" drawn with Bryntum Gantt: the server places, the chart shows and listens. */
export function StudyGantt({ region, snapshot, busy, onChange, scale, onSelect }: StudyGanttProps) {
  const messages = useMessages();
  const { t, language } = messages;
  const data = useMemo(
    () =>
      toGanttData(snapshot.timeline, {
        stage: (stage: PathwayStage) => t(`stage.${stage}`),
        payment: (course) => paymentName({ t, language }, course),
        finish: t('timeline.finish'),
      }),
    [snapshot, t, language],
  );
  const { courses, payments, stages } = data;
  const context: ChartContext = { region, messages, courses, payments, stages };
  const [latest] = useState(() =>
    createLatestBox({ context, plan: snapshot.timeline.plan, onChange }),
  );
  useLayoutEffect(() => {
    latest.write({ context, plan: snapshot.timeline.plan, onChange });
  });
  useEffect(() => {
    applyGanttLocale(language);
  }, [language]);
  const gantt = useRef<BryntumGantt>(null);
  // Bryntum derives child widget IDs from this one, so overlapping mounts need distinct IDs.
  const chartId = `rewire-gantt-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // Rows and arrows load together: loading the rows alone drops the arrows of the rows replaced.
  useEffect(() => {
    const project = gantt.current?.instance.project;
    if (project !== undefined) {
      project.inlineData = { tasks: data.tasks, dependencies: data.dependencies };
    }
  }, [data]);
  const config = useMemo(() => staticConfig(latest), [latest]);
  const columns = usePlanColumns(latest);
  const followLink = useInternalLinks();
  // The whole plan fills the width beside the table, within a readable width of a day.
  const { ref, width } = useWidth<HTMLDivElement>();
  const tickSize = weekWidth(scale, width - TABLE_WIDTH - 2, data.startDate, data.endDate);
  const todayAt = useTodayLine(gantt, ref, tickSize);
  return (
    <div ref={ref} className="rewire-gantt" data-scale={scale} onClick={followLink}>
      {todayAt !== null && (
        <span className="rewire-today-line" style={{ left: todayAt }} aria-hidden="true" />
      )}
      <BryntumGantt
        id={chartId}
        ref={gantt}
        {...config}
        columns={columns}
        tickSize={tickSize}
        startDate={data.startDate}
        endDate={data.endDate}
        readOnly={busy}
        ariaLabel={t('timeline.chartLabel')}
        onTaskClick={({ taskRecord }) => {
          onSelect?.(String(taskRecord.id));
        }}
      />
    </div>
  );
}

/** The columns of the table beside the chart, in the reader's language. */
function usePlanColumns(latest: LatestBox) {
  const { t } = useMessages();
  return useMemo(() => {
    const headers = {
      course: t('timeline.column.course'),
      hours: t('timeline.column.hours'),
      inPlan: t('timeline.column.inPlan'),
    };
    const source = () => latest.read().context;
    return planColumns(headers, source, gestureListeners(latest).onToggle);
  }, [t, latest]);
}

/** The configuration Bryntum reads once; everything that changes is read through `latest`. */
function staticConfig(latest: LatestBox): BryntumGanttProps {
  const source = () => latest.read().context;
  const { onAfterTaskDrop, onTaskResizeEnd } = gestureListeners(latest);
  return {
    ...PLAN_FEATURES,
    taskTooltipFeature: { template: ({ taskRecord }) => tooltipHtml(source, taskRecord) },
    taskRenderer: ({ taskRecord }) => barContent(source, taskRecord),
    taskStore: { fields: [{ name: 'inPlan', type: 'boolean' }] },
    viewPreset: {
      base: 'weekAndMonth',
      headers: [{ unit: 'month', dateFormat: 'MMM YYYY' }, weekHeader(source)],
    },
    snap: true,
    // The chart grows with its rows: the page scrolls, never the chart inside.
    autoHeight: true,
    rowHeight: 60,
    barMargin: 12,
    subGridConfigs: { locked: { width: TABLE_WIDTH } },
    zoomOnMouseWheel: false,
    zoomOnTimeAxisDoubleClick: false,
    onAfterTaskDrop,
    onTaskResizeEnd,
  };
}

/**
 * Where today falls across the body of the chart, in pixels from the chart's left edge, kept
 * in place as the axis scrolls or changes scale. Bryntum Community has no time ranges, so the
 * line is a layer of its own, placed with the chart's own coordinate of the day.
 */
function useTodayLine(
  gantt: RefObject<BryntumGantt | null>,
  frame: RefObject<HTMLDivElement | null>,
  tickSize: number,
): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const chart = gantt.current?.instance;
    const box = frame.current;
    if (chart === undefined || box === null) {
      return undefined;
    }
    const place = () => {
      const page = chart.getCoordinateFromDate(new Date(), false);
      const x = page - box.getBoundingClientRect().left - window.scrollX;
      setLeft(Number.isFinite(x) && x > TABLE_WIDTH ? x : null);
    };
    place();
    // Bryntum answers `on` with the function that removes the listeners again.
    const detach = chart.on({ horizontalScroll: place, resize: place }) as () => void;
    return () => {
      detach();
    };
  }, [gantt, frame, tickSize]);
  return left;
}
