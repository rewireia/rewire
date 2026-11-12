import type { MajorGroupInsight } from '@rewire/contracts';
import { BarSeriesModule, CategoryAxisModule, NumberAxisModule } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import { toPoints } from '../../../i18n/format.ts';
import { useMessages } from '../../../i18n/use-messages.ts';

import { horizontalBars, useStoryColors } from './chart-theme.ts';
import { majorGroupName } from './major-groups.ts';
import { bandOfScore, mostExposedGroup } from './story.ts';
import { StoryFigure } from './StoryFigure.tsx';

const MODULES = [BarSeriesModule, CategoryAxisModule, NumberAxisModule];

/** The mean score of each ISCO-08 major group, most exposed first, coloured by its band. */
export function GroupChart({ groups }: { readonly groups: readonly MajorGroupInsight[] }) {
  const { t, points } = useMessages();
  const colors = useStoryColors();
  const top = mostExposedGroup(groups);
  const sorted = useMemo(() => groups.toSorted((a, b) => b.meanScore - a.meanScore), [groups]);
  const options = useMemo(
    () =>
      horizontalBars(
        colors,
        sorted.map((group) => ({
          label: majorGroupName(t, group, true),
          title: majorGroupName(t, group),
          value: toPoints(group.meanScore),
          color: colors[bandOfScore(group.meanScore)],
        })),
        t('insights.groups.axis'),
        '',
      ),
    [sorted, colors, t],
  );
  if (top === null) {
    return null;
  }
  return (
    <StoryFigure
      title={t('insights.groups.title', {
        group: majorGroupName(t, top).toLowerCase(),
        points: points(top.meanScore),
      })}
      caption={t('insights.groups.caption')}
      chart={<AgCharts options={options} modules={MODULES} />}
      lines={sorted.map((group) =>
        t('insights.groups.row', {
          group: majorGroupName(t, group),
          points: points(group.meanScore),
        }),
      )}
    />
  );
}
