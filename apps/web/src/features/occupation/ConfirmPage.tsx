import { regionSchema } from '@rewire/contracts';
import { useParams, useSearchParams } from 'react-router';

import { useOccupation } from '../../api/queries.ts';
import { problemCode } from '../../api/request.ts';
import { NotFoundPage } from '../../app/NotFoundPage.tsx';
import pageStyles from '../../app/Page.module.css';
import { ButtonLink } from '../../components/Button.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { ConfirmOccupation } from './ConfirmOccupation.tsx';

/** `/:region/confirm?code=&isco=&title=`: the person checks the occupation Rewire found. */
export function ConfirmPage() {
  const { t } = useMessages();
  const region = regionSchema.safeParse(useParams().region);
  const [params, setParams] = useSearchParams();
  const code = params.get('code') ?? '';
  const title = params.get('title') ?? '';
  const isco08 = params.get('isco');
  const occupation = useOccupation(region.data ?? 'us', code, isco08);

  if (!region.success || code === '' || title.trim().length < 2) {
    return <NotFoundPage />;
  }
  const chooseGroup = (next: string) => {
    const changed = new URLSearchParams(params);
    changed.set('isco', next);
    setParams(changed, { replace: true });
  };
  if (problemCode(occupation.error) === 'not_found') {
    return (
      <div className={pageStyles.page}>
        <header className={pageStyles.intro}>
          <h1>{t('confirm.title')}</h1>
          <p className={pageStyles.lede}>{t('confirm.notFound')}</p>
          <ButtonLink to="/start">{t('confirm.back')}</ButtonLink>
        </header>
      </div>
    );
  }
  return (
    <div className={pageStyles.page}>
      <QueryState query={occupation}>
        {(detail) => (
          <ConfirmOccupation
            region={region.data}
            detail={detail}
            title={title}
            isco08={isco08}
            onChooseGroup={chooseGroup}
          />
        )}
      </QueryState>
    </div>
  );
}
