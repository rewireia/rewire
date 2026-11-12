import type {
  ExposureTask,
  LearnerProfile,
  OccupationMatch,
  TimeShare,
  UnitGroupLink,
} from '@rewire/contracts';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useReport, useSaveProfile, useSession } from '../../api/queries.ts';
import { updatePreferences, usePreferences } from '../../app/preferences.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { OfficialLanguageNote } from '../../components/Notes.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { TranslationNote, useTranslatedTasks } from '../../components/task-translations.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { reportPath } from '../occupation/links.ts';
import styles from './Journey.module.css';

type Times = Readonly<Record<string, TimeShare>>;
const SHARES = ['little', 'some', 'most'] as const;

export function TaskChoice({
  match,
  onBack,
}: {
  readonly match: OccupationMatch;
  readonly onBack: () => void;
}) {
  const { t } = useMessages();
  const groups = [match.unitGroup, ...match.alternatives].filter(
    (group): group is UnitGroupLink => group?.scored === true,
  );
  const [code, setCode] = useState(groups[0]?.isco08 ?? '');
  const report = useReport(code || null);
  const session = useSession();
  return (
    <div className={styles.conversation}>
      <span className={styles.eyebrow}>{t('conversation.stage.tasks')}</span>
      <h2 data-task-title className={styles.heading}>
        {t('conversation.tasks.title')}
      </h2>
      <p className={styles.intro}>{t('conversation.tasks.body')}</p>
      <section className={styles.exchange}>
        <h2>{match.occupation.title}</h2>
        <p className={styles.meta}>{match.occupation.code}</p>
        {groups.length > 1 && <GroupSelector groups={groups} code={code} onChange={setCode} />}
        {code ? (
          <QueryState query={report}>
            {(data) => (
              <QueryState query={session}>
                {(current) => (
                  <TaskForm
                    key={code}
                    match={match}
                    isco08={code}
                    tasks={data.tasks}
                    profile={current.profile}
                  />
                )}
              </QueryState>
            )}
          </QueryState>
        ) : (
          <p>{t('conversation.tasks.unavailable')}</p>
        )}
      </section>
      <div>
        <Button onClick={onBack}>{t('conversation.back')}</Button>
      </div>
    </div>
  );
}

function GroupSelector({
  groups,
  code,
  onChange,
}: {
  readonly groups: readonly UnitGroupLink[];
  readonly code: string;
  readonly onChange: (code: string) => void;
}) {
  const { t } = useMessages();
  return (
    <label className={styles.form}>
      {t('conversation.tasks.group')}
      <select
        value={code}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {groups.map((group) => (
          <option key={group.isco08} value={group.isco08}>
            {group.title ?? group.isco08}
          </option>
        ))}
      </select>
    </label>
  );
}

function useTaskSelection(
  match: OccupationMatch,
  isco08: string,
  tasks: readonly ExposureTask[],
  profile: LearnerProfile | null,
) {
  const { region } = usePreferences();
  const navigate = useNavigate();
  const save = useSaveProfile();
  const [times, setTimes] = useState<Times>(() => {
    if (
      profile?.region !== region ||
      profile.occupation.code !== match.occupation.code ||
      profile.occupation.isco08 !== isco08
    )
      return {};
    return Object.fromEntries(
      tasks.map((task) => [task.id, profile.timeByTask[task.id] ?? 'some']),
    );
  });
  const hasTasks = Object.values(times).some((time) => time !== 'none');
  const confirm = () => {
    const occupation = { code: match.occupation.code, title: match.occupation.title, isco08 };
    const timeByTask = Object.fromEntries(tasks.map((task) => [task.id, times[task.id] ?? 'none']));
    save.mutate(
      { region, occupation, timeByTask },
      {
        onSuccess: () => {
          updatePreferences({ occupation: { region, ...occupation } });
          void navigate(reportPath(region, isco08, occupation));
        },
      },
    );
  };
  return { times, setTimes, hasTasks, confirm, save };
}

function TaskForm({
  match,
  isco08,
  tasks,
  profile,
}: {
  readonly match: OccupationMatch;
  readonly isco08: string;
  readonly tasks: readonly ExposureTask[];
  readonly profile: LearnerProfile | null;
}) {
  const { t } = useMessages();
  const { times, setTimes, hasTasks, confirm, save } = useTaskSelection(
    match,
    isco08,
    tasks,
    profile,
  );
  const [extra, setExtra] = useState('');
  const translated = useTranslatedTasks(isco08);
  return (
    <div className={styles.form}>
      <OfficialLanguageNote />
      <TranslationNote status={translated.status} />
      <ul className={styles.taskList}>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            translated={translated}
            value={times[task.id] ?? 'none'}
            onChange={(value) => {
              setTimes((previous) => ({ ...previous, [task.id]: value }));
            }}
          />
        ))}
      </ul>
      <label htmlFor="journey-extra">{t('conversation.tasks.extra')}</label>
      <textarea
        id="journey-extra"
        maxLength={600}
        value={extra}
        onChange={(event) => {
          setExtra(event.target.value);
        }}
      />
      <p className={styles.meta}>{t('conversation.tasks.extraNote')}</p>
      {!hasTasks && <p className={styles.meta}>{t('conversation.tasks.none')}</p>}
      {save.isError && <ErrorNotice error={save.error} />}
      <div>
        <Button primary disabled={!hasTasks || save.isPending} onClick={confirm}>
          {t('conversation.tasks.report')}
        </Button>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  translated,
  value,
  onChange,
}: {
  readonly task: ExposureTask;
  readonly translated: ReturnType<typeof useTranslatedTasks>;
  readonly value: TimeShare;
  readonly onChange: (value: TimeShare) => void;
}) {
  const { t } = useMessages();
  const text = translated.text(task);
  return (
    <li className={styles.task}>
      <label>
        <input
          type="checkbox"
          checked={value !== 'none'}
          onChange={(event) => {
            onChange(event.target.checked ? 'some' : 'none');
          }}
        />
        <span lang={translated.language(task)} title={translated.original(task)}>
          {text}
        </span>
      </label>
      <select
        aria-label={t('conversation.tasks.time', { task: text })}
        value={value}
        disabled={value === 'none'}
        onChange={(event) => {
          onChange(event.target.value as TimeShare);
        }}
      >
        <option value="none">{t('time.none')}</option>
        {SHARES.map((share) => (
          <option key={share} value={share}>
            {t(`time.${share}`)}
          </option>
        ))}
      </select>
    </li>
  );
}
