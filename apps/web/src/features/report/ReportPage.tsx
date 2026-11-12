import {
  regionSchema,
  unitGroupCodeSchema,
  type LearnerProfile,
  type Region,
} from '@rewire/contracts';
import { useParams, useSearchParams } from 'react-router';

import { useReport, useSession } from '../../api/queries.ts';
import { NotFoundPage } from '../../app/NotFoundPage.tsx';
import { LoadingBar } from '../../components/LoadingBar.tsx';
import { QueryState } from '../../components/QueryState.tsx';

import { useMessages } from '../../i18n/use-messages.ts';

import { JourneyFrame } from '../journey/JourneyFrame.tsx';
import journeyStyles from '../journey/Journey.module.css';

import { ReportView } from './ReportView.tsx';

/** A regional occupation is reusable only for the same region and international group. */
export function chosenOccupation(
  region: Region,
  isco08: string,
  code: string | null,
  title: string | null,
  profile: Pick<LearnerProfile, 'region' | 'occupation'> | null,
) {
  if (code && title) return { code, title };
  if (profile?.region !== region || profile.occupation.isco08 !== isco08) return null;
  return { code: profile.occupation.code, title: profile.occupation.title };
}

/** `/:region/report/:isco08?code=&title=`: the exposure report of an occupation. */
export function ReportPage() {
  const { t } = useMessages();
  const params = useParams();
  const region = regionSchema.safeParse(params.region);
  const isco08 = unitGroupCodeSchema.safeParse(params.isco08);
  const [search] = useSearchParams();
  const report = useReport(isco08.success ? isco08.data : null);
  const session = useSession();

  if (!region.success || !isco08.success) {
    return <NotFoundPage />;
  }
  const chosen = chosenOccupation(
    region.data,
    isco08.data,
    search.get('code'),
    search.get('title'),
    session.data?.profile ?? null,
  );
  return (
    <JourneyFrame stage="report">
      <div className={journeyStyles.report}>
        <QueryState query={report} loadingLabel={t('report.preparing')}>
          {(data) =>
            // The saved time of each task is read before the report shows its figures.
            session.isPending ? (
              <LoadingBar label={t('report.profileLoading')} />
            ) : (
              <ReportView
                key={data.isco08}
                region={region.data}
                report={data}
                chosen={chosen}
                profile={session.data?.profile ?? null}
              />
            )
          }
        </QueryState>
      </div>
    </JourneyFrame>
  );
}
