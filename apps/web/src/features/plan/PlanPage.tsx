import { regionSchema, unitGroupCodeSchema, type Pathway } from '@rewire/contracts';
import { Link, useParams } from 'react-router';

import { usePathway } from '../../api/commerce-queries.ts';
import { usePreferences } from '../../app/preferences.ts';
import { NotFoundPage } from '../../app/NotFoundPage.tsx';
import pageStyles from '../../app/Page.module.css';
import { OfficialLanguageNote } from '../../components/Notes.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { reportPath } from '../occupation/links.ts';
import { JourneyFrame } from '../journey/JourneyFrame.tsx';
import journeyStyles from '../journey/Journey.module.css';

import { PlanFocus } from './PlanFocus.tsx';
import styles from './Plan.module.css';
import { TrainingSelection } from './TrainingSelection.tsx';

/** `/:region/plan/:isco08`: the learning plan and provider course catalogue. */
export function PlanPage() {
  const params = useParams();
  const region = regionSchema.safeParse(params.region);
  const isco08 = unitGroupCodeSchema.safeParse(params.isco08);
  const pathway = usePathway(region.data ?? 'us', isco08.data ?? '0000');
  if (!region.success || !isco08.success) {
    return <NotFoundPage />;
  }
  return (
    <JourneyFrame stage="training">
      <div className={journeyStyles.report}>
        <QueryState query={pathway}>{(data) => <PlanView pathway={data} />}</QueryState>
      </div>
    </JourneyFrame>
  );
}

function PlanView({ pathway }: { readonly pathway: Pathway }) {
  const { t } = useMessages();
  const { occupation } = usePreferences();
  const mine = occupation?.isco08 === pathway.isco08 ? occupation : undefined;
  return (
    <>
      <header className={pageStyles.intro}>
        <span className={pageStyles.eyebrow}>{t('plan.eyebrow')}</span>
        <h1>{t('plan.continuity')}</h1>
        <p className={styles.occupation}>{mine?.title ?? pathway.occupationTitle}</p>
        <p className={pageStyles.lede}>{t('plan.lede')}</p>
        <Link to={reportPath(pathway.region, pathway.isco08, mine)} className={styles.small}>
          {t('plan.toReport')}
        </Link>
        <OfficialLanguageNote />
      </header>
      <PlanFocus focus={pathway.focus} isco08={pathway.isco08} />
      <TrainingSelection region={pathway.region} isco08={pathway.isco08} />
    </>
  );
}
