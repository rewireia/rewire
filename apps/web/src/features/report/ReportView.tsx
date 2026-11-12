import type {
  ExposureReport,
  LearnerProfile,
  PersonalExposureRequest,
  Region,
} from '@rewire/contracts';
import { useMemo } from 'react';

import { usePersonalExposure } from '../../api/queries.ts';
import pageStyles from '../../app/Page.module.css';
import { ButtonLink } from '../../components/Button.tsx';
import { OfficialLanguageNote } from '../../components/Notes.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { ReportSummary } from './ReportSummary.tsx';
import { Explanation } from './Explanation.tsx';
import { Labour } from './Labour.tsx';
import styles from './ReportView.module.css';
import { TaskSection } from './TaskSection.tsx';
import type { TimeByTask } from './times.ts';

const EMPTY_TIMES: TimeByTask = {};

interface ReportViewProps {
  readonly region: Region;
  readonly report: ExposureReport;
  readonly chosen: { readonly code: string; readonly title: string } | null;
  /** The learner's saved profile, if any. */
  readonly profile: LearnerProfile | null;
}

type Chosen = ReportViewProps['chosen'];

/** The occupation the person chose, or the international group alone. */
function ReportHeader({
  report,
  chosen,
}: {
  readonly report: ExposureReport;
  readonly chosen: Chosen;
}) {
  const { t } = useMessages();
  return (
    <header className={styles.header}>
      <span className={pageStyles.eyebrow}>
        {chosen === null ? t('report.groupOnly', { code: report.isco08 }) : chosen.code}
      </span>
      <h1>{chosen?.title ?? report.title}</h1>
      {chosen !== null && (
        <p className={styles.through}>
          {t('report.readThrough', { title: report.title, code: report.isco08 })}
        </p>
      )}
      <OfficialLanguageNote />
    </header>
  );
}

/** The report: the three figures, the week, every task and the next learning step. */
export function ReportView({ region, report, chosen, profile }: ReportViewProps) {
  const stored = profile?.occupation.isco08 === report.isco08 ? profile : null;
  const timeByTask = stored?.timeByTask ?? EMPTY_TIMES;
  const request = useMemo<PersonalExposureRequest | null>(
    () => (Object.values(timeByTask).every((share) => share === 'some') ? null : { timeByTask }),
    [timeByTask],
  );
  const asked = usePersonalExposure(report.isco08, request);
  const personal = request === null ? report.personal : (asked.data ?? report.personal);

  return (
    <>
      <ReportHeader report={report} chosen={chosen} />
      <ReportSummary report={report} personal={personal} updating={asked.isFetching} />
      <Explanation region={region} report={report} timeByTask={timeByTask} />
      <TaskSection report={report} personal={personal} timeByTask={timeByTask} />
      <Labour region={region} code={chosen?.code ?? null} isco08={report.isco08} />
      <NextAction region={region} isco08={report.isco08} />
    </>
  );
}

function NextAction({ region, isco08 }: { readonly region: Region; readonly isco08: string }) {
  const { t } = useMessages();
  return (
    <section className={styles.next} aria-labelledby="report-next">
      <div>
        <h2 id="report-next">{t('report.plan.title')}</h2>
        <p>{t('report.plan.lede')}</p>
      </div>
      <ButtonLink primary to={`/${region}/plan/${isco08}`}>
        {t('report.plan')}
      </ButtonLink>
    </section>
  );
}
