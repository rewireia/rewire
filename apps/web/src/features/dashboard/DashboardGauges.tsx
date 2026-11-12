import type { LearnerProfile, Region, RoadmapCourse } from '@rewire/contracts';

import { useWallet } from '../../api/marketplace-queries.ts';
import { useReport } from '../../api/queries.ts';
import { ButtonLink } from '../../components/Button.tsx';
import { RadialGauge } from '../../components/RadialGauge.tsx';
import { formatMoney, interpolate, toPoints } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import {
  exposureBands,
  planBands,
  planProgress,
  walletBands,
  walletUse,
} from './gauge-readings.ts';
import styles from './Overview.module.css';

/** Three measures read from the server: occupation exposure, plan progress and wallet use. */
export function DashboardGauges({
  region,
  profile,
  courses,
  planPath,
}: {
  readonly region: Region;
  readonly profile: LearnerProfile | null;
  readonly courses: readonly RoadmapCourse[] | undefined;
  readonly planPath: string;
}) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  return (
    <section className={styles.gauges} aria-labelledby="dashboard-gauges">
      <header className={styles.cardHead}>
        <p className={styles.eyebrow}>{copy.gaugesEyebrow}</p>
        <h2 id="dashboard-gauges">{copy.gauges}</h2>
      </header>
      <div className={styles.gaugeRow}>
        <ExposureGauge isco08={profile?.occupation.isco08 ?? null} />
        <PlanGauge courses={courses} planPath={planPath} />
        <WalletGauge region={region} />
      </div>
    </section>
  );
}

function EmptyMeasure({
  text,
  action,
  to,
}: {
  readonly text: string;
  readonly action: string;
  readonly to: string;
}) {
  return (
    <>
      <p>{text}</p>
      <ButtonLink to={to}>{action}</ButtonLink>
    </>
  );
}

function ExposureGauge({ isco08 }: { readonly isco08: string | null }) {
  const { language, t } = useMessages();
  const copy = dashboardCopy[language];
  const report = useReport(isco08);
  const score = report.data?.meanScore;
  const bands = exposureBands({
    'very-low': t('band.very-low'),
    low: t('band.low'),
    medium: t('band.medium'),
    high: t('band.high'),
  });
  return (
    <RadialGauge
      label={copy.exposureLabel}
      value={score === undefined ? null : toPoints(score)}
      bands={bands}
      unit="/100"
      note={score === undefined ? undefined : copy.exposureNote}
      empty={
        isco08 === null ? (
          <EmptyMeasure text={copy.exposureEmpty} action={copy.exposureAction} to="/start" />
        ) : (
          <p>{report.isError ? copy.unavailable : copy.loading}</p>
        )
      }
    />
  );
}

function PlanGauge({
  courses,
  planPath,
}: {
  readonly courses: readonly RoadmapCourse[] | undefined;
  readonly planPath: string;
}) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const progress = courses === undefined ? null : planProgress(courses);
  const caption = progress === null ? undefined : interpolate(copy.planCaption, progress, language);
  return (
    <RadialGauge
      label={copy.planLabel}
      value={progress?.percent ?? null}
      bands={planBands(copy.planBands)}
      unit="%"
      caption={caption}
      valueText={caption}
      empty={
        courses === undefined ? (
          <p>{copy.loading}</p>
        ) : (
          <EmptyMeasure text={copy.planEmpty} action={copy.planAction} to={planPath} />
        )
      }
    />
  );
}

function WalletGauge({ region }: { readonly region: Region }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const wallet = useWallet(region);
  const data = wallet.data;
  const use = data === undefined ? null : walletUse(data);
  const caption =
    data === undefined || use === null
      ? undefined
      : interpolate(
          copy.walletCaption,
          {
            spent: formatMoney({ currency: data.currency, minorUnits: data.spentMinor }, language),
            funded: formatMoney(
              { currency: data.currency, minorUnits: data.fundedMinor },
              language,
            ),
          },
          language,
        );
  return (
    <RadialGauge
      label={copy.walletLabel}
      value={use}
      bands={walletBands(copy.walletBands)}
      unit="%"
      caption={caption}
      valueText={caption}
      empty={
        data === undefined ? (
          <p>{wallet.isError ? copy.unavailable : copy.loading}</p>
        ) : (
          <EmptyMeasure text={copy.walletEmpty} action={copy.addFunds} to="?tab=wallet" />
        )
      }
    />
  );
}
