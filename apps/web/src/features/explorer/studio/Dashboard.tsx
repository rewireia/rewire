import {
  AgStudioAiModule,
  type AgContextMenuItem,
  type AgDataSourcesDefinition,
  type AgFilterDefinition,
  type AgGetContextMenuParams,
  type AgPanelConfig,
  type AgReportState,
  type AgStudioApi,
} from 'ag-studio';
import { AgStudio, createWidgets } from 'ag-studio-react';
import { useState } from 'react';

import { api as rewire } from '../../../api/instance.ts';
import type { Messages } from '../../../i18n/use-messages.ts';

import { createAnalystAdapter } from './analyst/analyst-adapter.ts';
import { createAnalystHarness } from './analyst/analyst-harness.ts';
import { FigureCell, figureRenderer } from './FigureCell.tsx';
import { focusWidgetOf } from './focus/focus-widget.ts';
import type { RewireRegistry } from './registry.ts';
import { BREAKPOINTS } from './responsive.ts';
import { studioLocaleOf } from './studio-locale.ts';
import { useStudioTheme } from './studio-theme.ts';
import type { StudioMode } from './StudioTools.tsx';

/** Studio's panels: to read, the filters; to design, the data, the editor and the filters. */
const PANELS: Readonly<Record<StudioMode, AgPanelConfig>> = {
  read: { view: { right: ['filters'] } },
  design: { edit: { left: ['data'], right: ['edit', 'filters'] } },
  analyst: { edit: { right: ['ai'] } },
};

const MODULES = [AgStudioAiModule];

export interface DashboardProps {
  readonly messages: Messages;
  readonly openReport: () => AgReportState<RewireRegistry>;
  readonly data: AgDataSourcesDefinition<RewireRegistry>;
  readonly mode: StudioMode;
  readonly analystOffered: boolean;
  readonly drill: AgFilterDefinition | null;
  readonly contextMenu: (params: AgGetContextMenuParams) => AgContextMenuItem[];
  /** Studio opened: the tools above it can follow it. */
  readonly onOpen: (api: AgStudioApi) => void;
  /** The report changed: kept, and followed. */
  readonly onState: (api: AgStudioApi) => void;
}

function widgetsOf(t: Messages['t']) {
  return createWidgets<RewireRegistry>({
    overrides: [{ id: 'grid', options: { createCellRenderer: figureRenderer(FigureCell) } }],
    additionalTypes: [focusWidgetOf(t)],
  });
}

/** One opened Studio: it reads its report once, when it opens, as Studio itself does. */
export function Dashboard(props: DashboardProps) {
  const { messages, openReport, data, mode, analystOffered, drill, onOpen, onState } = props;
  const { t, language } = messages;
  const theme = useStudioTheme();
  const [initialState] = useState(openReport);
  const [widgets] = useState(() => widgetsOf(t));
  // Studio hands the harness its core API, typed narrower than the API it is at run time.
  const ai = ({ api }: { readonly api: unknown }) =>
    createAnalystHarness(api as AgStudioApi, {
      adapter: createAnalystAdapter((body, signal) => rewire.studioTurn(body, signal)),
      language,
      t,
      readReport: (isco08, signal) => rewire.report(isco08, signal),
    });
  return (
    <AgStudio<RewireRegistry>
      style={{ height: '100%' }}
      modules={MODULES}
      data={data}
      initialState={initialState}
      mode={mode === 'read' ? 'view' : 'edit'}
      theme={theme}
      widgets={widgets}
      localeText={studioLocaleOf(language)}
      panels={PANELS[mode]}
      responsiveLayoutBreakpoints={BREAKPOINTS}
      drillThrough={drill === null ? {} : { filter: drill }}
      getContextMenuItems={props.contextMenu}
      {...(analystOffered ? { ai } : {})}
      onApiReady={({ api }) => {
        onOpen(api);
      }}
      onStateUpdated={({ api }) => {
        onState(api);
      }}
    />
  );
}
