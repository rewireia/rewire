import type { EmploymentFigure, PayFigure, Region } from '@rewire/contracts';

import { useLabour } from '../../api/queries.ts';
import { BigFigure } from '../../components/BigFigure.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { formatWholeAmount } from '../../i18n/format.ts';
import { useMessages, type Messages } from '../../i18n/use-messages.ts';

import styles from './Labour.module.css';

interface LabourProps {
  readonly region: Region;
  /** Code of the occupation in the classification of the region; `null` reads the group alone. */
  readonly code: string | null;
  readonly isco08: string;
}

/** What a figure is about: the occupation, or the wider group the source stops at. */
function scopeOf(figure: EmploymentFigure | PayFigure, t: Messages['t']): string {
  if (figure.level === 'regional-occupation') {
    return t('labour.scope.own');
  }
  return t('labour.scope.group', { group: figure.groupTitle ?? figure.groupCode });
}

function Population({ figure }: { readonly figure: EmploymentFigure | PayFigure }) {
  const { t } = useMessages();
  return (
    <span className={styles.source}>
      {t('labour.population', { population: figure.population })}
    </span>
  );
}

function Employment({ figure }: { readonly figure: EmploymentFigure | null }) {
  const { t, language } = useMessages();
  if (figure === null) {
    return <p className={styles.none}>{t('labour.employment.none')}</p>;
  }
  const scope = scopeOf(figure, t);
  return (
    <BigFigure
      label={t('labour.employment.label')}
      value={new Intl.NumberFormat(language).format(figure.value)}
      sentence={
        <>
          {t(`labour.employment.${figure.counts}`, { scope, period: figure.period })}{' '}
          <Population figure={figure} />
        </>
      }
    />
  );
}

function Pay({ figure }: { readonly figure: PayFigure | null }) {
  const { t, language } = useMessages();
  if (figure === null) {
    return <p className={styles.none}>{t('labour.pay.none')}</p>;
  }
  const scope = scopeOf(figure, t);
  return (
    <BigFigure
      label={t(`labour.pay.${figure.measure}`)}
      value={formatWholeAmount(figure.value, figure.currency, language)}
      sentence={
        <>
          {t(`labour.pay.${figure.measure}.sentence`, { scope, period: figure.period })}{' '}
          <Population figure={figure} />
        </>
      }
    />
  );
}

/**
 * "Your labour market": employment and pay, each saying honestly what it counts. Opened from
 * the explorer or the guide, with no regional occupation, it shows what is published by group.
 */
export function Labour({ region, code, isco08 }: LabourProps) {
  const { t } = useMessages();
  const labour = useLabour(region, code, isco08);
  return (
    <section className={styles.panel} aria-labelledby="report-labour">
      <h2 id="report-labour">{t('labour.title')}</h2>
      <QueryState query={labour}>
        {({ employment, pay }) =>
          // Without the regional occupation, a region that publishes nothing by group has nothing.
          code === null && employment === null && pay === null ? (
            <p>{t('labour.noOccupation')}</p>
          ) : (
            <div className={styles.figures}>
              <Employment figure={employment} />
              <Pay figure={pay} />
            </div>
          )
        }
      </QueryState>
    </section>
  );
}
