import type { UnitGroupSummary } from '@rewire/contracts';
import { lazy, Suspense } from 'react';

import { useUnitGroups } from '../../api/queries.ts';
import pageStyles from '../../app/Page.module.css';
import { usePreferences } from '../../app/preferences.ts';
import { LoadingBar } from '../../components/LoadingBar.tsx';
import { OfficialLanguageNote } from '../../components/Notes.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { Capsule } from '../../components/Capsule.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { ExplorerView } from './ExplorerView.tsx';
import { RegionBand } from './story/RegionBand.tsx';
import { RegionStory } from './story/RegionStory.tsx';
import storyStyles from './story/Story.module.css';
import { useExploreView } from './use-explore-view.ts';

// AG Studio loads only when the dashboard is shown.
const ExploreStudio = lazy(async () => ({
  default: (await import('./studio/ExploreStudio.tsx')).ExploreStudio,
}));

/** The table or, on a wide screen, the dashboard, with the switch between them. */
function Occupations({ unitGroups }: { readonly unitGroups: readonly UnitGroupSummary[] }) {
  const { t } = useMessages();
  const { view, offerAnalyse, choose } = useExploreView();
  return (
    <>
      {offerAnalyse && (
        <Capsule
          legend={t('explore.view')}
          hideLegend
          value={view}
          options={[
            { value: 'analyse', label: t('explore.view.analyse') },
            { value: 'table', label: t('explore.view.table') },
          ]}
          onChange={choose}
        />
      )}
      {view === 'analyse' ? (
        <Suspense fallback={<LoadingBar />}>
          <ExploreStudio unitGroups={unitGroups} />
        </Suspense>
      ) : (
        <ExplorerView unitGroups={unitGroups} />
      )}
    </>
  );
}

/**
 * `/explore`: the band of regions, the data story of the region chosen, and then every occupation
 * the ILO scores, in a table or a dashboard.
 */
export function ExplorerPage() {
  const { t } = useMessages();
  const { region } = usePreferences();
  const unitGroups = useUnitGroups();
  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.intro}>
        <h1>{t('explore.title')}</h1>
        <p className={pageStyles.lede}>{t('explore.lede')}</p>
        <OfficialLanguageNote />
      </header>
      <RegionBand />
      <RegionStory region={region} />
      <section className={storyStyles.story} aria-labelledby="explore-yourself">
        <header className={storyStyles.storyHead}>
          <p className={storyStyles.eyebrow}>{t('insights.yourself.eyebrow')}</p>
          <h2 id="explore-yourself">{t('insights.yourself.title')}</h2>
          <p className={storyStyles.lede}>{t('insights.yourself.lede')}</p>
        </header>
        <QueryState query={unitGroups}>
          {({ unitGroups: list }) => <Occupations unitGroups={list} />}
        </QueryState>
      </section>
    </div>
  );
}
