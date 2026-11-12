import type { DiscountBeacon, Region } from '@rewire/contracts';
import { useState } from 'react';

import { useCatalogue } from '../../api/marketplace-queries.ts';
import { useBeacons, useCancelBeacon, useStartBeacon } from '../../api/seller-queries.ts';
import { Button } from '../../components/Button.tsx';
import { Capsule } from '../../components/Capsule.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Business.module.css';
import {
  dateOfLocalInput,
  endOf,
  localInputOf,
  validWindow,
  type EndShortcut,
} from './beacon-window.ts';

type Percent = '10' | '15' | '25' | '40' | 'other';
type Start = 'now' | 'at';

const TONES: Readonly<Record<DiscountBeacon['status'], string>> = {
  scheduled: 'warn',
  active: 'good',
  ended: 'muted',
  cancelled: 'error',
};

/** When a time is: its day and hour, in the reader's language and time. */
function useTimeText() {
  const { language } = useMessages();
  const format = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' });
  return (date: Date | string) => format.format(new Date(date));
}

/** The seller's discount beacons: one to activate, and those already set. */
export function BeaconPanel({ region }: { readonly region: Region }) {
  return (
    <div className={styles.view}>
      <BeaconForm region={region} />
      <BeaconList region={region} />
    </div>
  );
}

/** The beacon being set: its percentage and its window, in the browser's time. */
function useBeaconDraft() {
  const [percent, setPercent] = useState<Percent>('25');
  const [other, setOther] = useState('20');
  const [start, setStart] = useState<Start>('now');
  const [startAt, setStartAt] = useState(() => localInputOf(new Date()));
  const [endAt, setEndAt] = useState(() => localInputOf(endOf(new Date(), 'three-hours')));
  const now = new Date();
  const from = start === 'now' ? now : dateOfLocalInput(startAt);
  const to = dateOfLocalInput(endAt);
  const amount = Number(percent === 'other' ? other : percent);
  const window =
    from !== null && to !== null && validWindow(from, to, now) && amount >= 5 && amount <= 90
      ? { from, to, amount }
      : null;
  return {
    percent: { percent, setPercent, other, setOther },
    times: {
      start,
      setStart,
      startAt,
      setStartAt,
      endAt,
      setEndAt,
      shortcut: (which: EndShortcut) => {
        setEndAt(localInputOf(endOf(from ?? now, which)));
      },
    },
    window,
  };
}

function BeaconForm({ region }: { readonly region: Region }) {
  const { t, language } = useMessages();
  const time = useTimeText();
  const draft = useBeaconDraft();
  const { window } = draft;
  const startBeacon = useStartBeacon();
  const catalogue = useCatalogue(region);
  const onSale = catalogue.data?.courses.filter((course) => course.published).length ?? 0;
  return (
    <form
      className={styles.beaconForm}
      onSubmit={(event) => {
        event.preventDefault();
        if (window === null) return;
        startBeacon.mutate({
          region,
          percent: window.amount,
          startsAt: window.from.toISOString(),
          endsAt: window.to.toISOString(),
        });
      }}
    >
      <div className={styles.cardHead}>
        <h3>{t('beacon.title')}</h3>
        <p>{t('beacon.intro')}</p>
      </div>
      <PercentField {...draft.percent} />
      <WindowFields {...draft.times} />
      <p className={styles.preview} role="status">
        {window
          ? t('beacon.preview', {
              percent: window.amount,
              count: new Intl.NumberFormat(language).format(onSale),
              start: time(window.from),
              end: time(window.to),
            })
          : t('beacon.invalid')}
      </p>
      <div className={styles.termsActions}>
        <Button primary type="submit" disabled={window === null || startBeacon.isPending}>
          {t('beacon.activate')}
        </Button>
      </div>
      {startBeacon.isError && <ErrorNotice error={startBeacon.error} />}
    </form>
  );
}

function PercentField({
  percent,
  setPercent,
  other,
  setOther,
}: {
  readonly percent: Percent;
  readonly setPercent: (percent: Percent) => void;
  readonly other: string;
  readonly setOther: (value: string) => void;
}) {
  const { t } = useMessages();
  return (
    <div className={styles.filters}>
      <Capsule<Percent>
        legend={t('beacon.percent')}
        value={percent}
        onChange={setPercent}
        options={[
          ...(['10', '15', '25', '40'] as const).map((value) => ({
            value,
            label: `${value} %`,
          })),
          { value: 'other' as const, label: t('beacon.other') },
        ]}
      />
      {percent === 'other' && (
        <label className={styles.field}>
          {t('beacon.otherPercent')}
          <input
            type="number"
            min="5"
            max="90"
            step="1"
            value={other}
            onChange={(event) => {
              setOther(event.target.value);
            }}
          />
        </label>
      )}
    </div>
  );
}

function WindowFields(props: {
  readonly start: Start;
  readonly setStart: (start: Start) => void;
  readonly startAt: string;
  readonly setStartAt: (value: string) => void;
  readonly endAt: string;
  readonly setEndAt: (value: string) => void;
  readonly shortcut: (which: EndShortcut) => void;
}) {
  const { t } = useMessages();
  return (
    <div className={styles.filters}>
      <Capsule<Start>
        legend={t('beacon.start')}
        value={props.start}
        onChange={props.setStart}
        options={[
          { value: 'now', label: t('beacon.startNow') },
          { value: 'at', label: t('beacon.startAt') },
        ]}
      />
      {props.start === 'at' && (
        <label className={styles.field}>
          {t('beacon.startTime')}
          <input
            type="datetime-local"
            value={props.startAt}
            onChange={(event) => {
              props.setStartAt(event.target.value);
            }}
          />
        </label>
      )}
      <label className={styles.field}>
        {t('beacon.end')}
        <input
          type="datetime-local"
          value={props.endAt}
          onChange={(event) => {
            props.setEndAt(event.target.value);
          }}
        />
      </label>
      <EndShortcuts shortcut={props.shortcut} />
    </div>
  );
}

/** Ends a beacon an hour or three after it starts, or at midnight. */
function EndShortcuts({ shortcut }: { readonly shortcut: (which: EndShortcut) => void }) {
  const { t } = useMessages();
  return (
    <div className={styles.shortcuts}>
      {(
        [
          ['one-hour', 'beacon.oneHour'],
          ['three-hours', 'beacon.threeHours'],
          ['midnight', 'beacon.midnight'],
        ] as const
      ).map(([which, label]) => (
        <button
          key={which}
          type="button"
          className={styles.shortcut}
          onClick={() => {
            shortcut(which);
          }}
        >
          {t(label)}
        </button>
      ))}
    </div>
  );
}

function BeaconList({ region }: { readonly region: Region }) {
  const { t } = useMessages();
  const time = useTimeText();
  const beacons = useBeacons(region);
  const cancel = useCancelBeacon();
  return (
    <section className={styles.card} aria-label={t('beacon.list')}>
      <div className={styles.cardHead}>
        <h3>{t('beacon.list')}</h3>
      </div>
      <QueryState query={beacons}>
        {({ beacons: list }) =>
          list.length === 0 ? (
            <p className={styles.figureNote}>{t('beacon.none')}</p>
          ) : (
            <ul className={styles.beacons}>
              {list.map((beacon) => (
                <li key={beacon.id}>
                  <span className={styles.chip} data-tone={TONES[beacon.status]}>
                    {t(`beacon.status.${beacon.status}`)}
                  </span>
                  <span>
                    {t('beacon.window', {
                      percent: beacon.percent,
                      start: time(beacon.startsAt),
                      end: time(beacon.endsAt),
                    })}
                  </span>
                  {(beacon.status === 'active' || beacon.status === 'scheduled') && (
                    <Button
                      disabled={cancel.isPending}
                      onClick={() => {
                        cancel.mutate(beacon.id);
                      }}
                    >
                      {t('beacon.cancel')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>
      {cancel.isError && <ErrorNotice error={cancel.error} />}
    </section>
  );
}
