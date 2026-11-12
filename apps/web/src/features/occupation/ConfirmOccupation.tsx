import type { OccupationDetail, Region, UnitGroupLink } from '@rewire/contracts';
import { useNavigate } from 'react-router';

import { useSaveProfile, useSession } from '../../api/queries.ts';
import { updatePreferences } from '../../app/preferences.ts';
import pageStyles from '../../app/Page.module.css';
import { Button, ButtonLink } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { OfficialLanguageNote } from '../../components/Notes.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { Alternatives } from './Alternatives.tsx';
import styles from './ConfirmPage.module.css';
import { GroupTasks } from './GroupTasks.tsx';
import { reportPath } from './links.ts';
import { linksOf } from './match.ts';

interface ConfirmOccupationProps {
  readonly region: Region;
  readonly detail: OccupationDetail;
  /** The job title the person recognised as theirs. */
  readonly title: string;
  readonly isco08: string | null;
  readonly onChooseGroup: (isco08: string) => void;
}

/** Saves the confirmed occupation in the learner's profile, then opens its report. */
function useConfirm(region: Region, detail: OccupationDetail, title: string) {
  const navigate = useNavigate();
  const session = useSession();
  const save = useSaveProfile();
  const { occupation } = detail;
  const confirm = (link: UnitGroupLink) => {
    const mine = { code: occupation.code, title, isco08: link.isco08 };
    const stored = session.data?.profile;
    // The time already given to the tasks of the same group is kept.
    const timeByTask = stored?.occupation.isco08 === link.isco08 ? stored.timeByTask : {};
    save.mutate(
      { region, occupation: mine, timeByTask },
      {
        onSuccess: () => {
          updatePreferences({ occupation: { region, ...mine, title: occupation.title } });
          const official = { code: occupation.code, title: occupation.title };
          void navigate(reportPath(region, link.isco08, official));
        },
      },
    );
  };
  return { confirm, save };
}

export function ConfirmOccupation({
  region,
  detail,
  title,
  isco08,
  onChooseGroup,
}: ConfirmOccupationProps) {
  const { t } = useMessages();
  const { confirm, save } = useConfirm(region, detail, title);
  const links = linksOf(detail);
  const chosen: UnitGroupLink | undefined =
    links.find((link) => link.isco08 === isco08) ?? links[0];
  const { occupation } = detail;
  return (
    <>
      <header className={styles.occupation}>
        <span className={pageStyles.eyebrow}>{t('confirm.title')}</span>
        <h1>{occupation.title}</h1>
        <span className={styles.code}>{t('confirm.code', { code: occupation.code })}</span>
        {occupation.description !== null && (
          <p className={styles.description}>{occupation.description}</p>
        )}
        <OfficialLanguageNote />
      </header>
      {chosen === undefined ? (
        <section className={pageStyles.intro}>
          <p>{t('confirm.noGroup')}</p>
          <ButtonLink to="/start">{t('confirm.back')}</ButtonLink>
        </section>
      ) : (
        <>
          <ChosenGroup link={chosen} />
          <ConfirmTasks
            link={chosen}
            saving={save.isPending}
            onConfirm={() => {
              confirm(chosen);
            }}
          />
          {save.isError && <ErrorNotice error={save.error} />}
          <Alternatives links={links} current={chosen.isco08} onChoose={onChooseGroup} />
        </>
      )}
    </>
  );
}

function ChosenGroup({ link }: { readonly link: UnitGroupLink }) {
  const { t } = useMessages();
  return (
    <section className={styles.link} aria-label={t('confirm.groupLabel')}>
      <span className={pageStyles.eyebrow}>{t('confirm.groupLabel')}</span>
      <span className={styles.groupTitle}>
        {link.title ?? t('confirm.untitledGroup')}{' '}
        <span className={styles.code}>{link.isco08}</span>
      </span>
      <p>{t(`basis.${link.basis}`)}</p>
      <p className={styles.explain}>{t('confirm.groupExplained')}</p>
    </section>
  );
}

function ConfirmTasks({
  link,
  saving,
  onConfirm,
}: {
  readonly link: UnitGroupLink;
  readonly saving: boolean;
  readonly onConfirm: () => void;
}) {
  const { t } = useMessages();
  return (
    <section className={pageStyles.section} aria-labelledby="confirm-tasks">
      <h2 id="confirm-tasks">{t('confirm.tasks')}</h2>
      {link.scored ? <GroupTasks isco08={link.isco08} /> : <p>{t('confirm.unscored')}</p>}
      <div className={styles.actions}>
        {link.scored ? (
          <Button primary onClick={onConfirm} disabled={saving}>
            {t('confirm.yes')}
          </Button>
        ) : (
          <ButtonLink to="/start">{t('confirm.back')}</ButtonLink>
        )}
      </div>
    </section>
  );
}
