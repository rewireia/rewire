import { regionSchema } from '@rewire/contracts';
import { useParams } from 'react-router';
import { usePaymentConfig } from '../../api/commerce-queries.ts';
import { NotFoundPage } from '../../app/NotFoundPage.tsx';
import pageStyles from '../../app/Page.module.css';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { SandboxBuyer } from './SandboxBuyer.tsx';
import styles from './SandboxBuyer.module.css';

/** A separate tab stays usable while PayPal covers the checkout tab. No payment is started here. */
export function SandboxAccessPage() {
  const { t } = useMessages();
  const params = useParams();
  const region = regionSchema.safeParse(params.region);
  const payment = usePaymentConfig(region.success ? region.data : 'us');
  if (!region.success) return <NotFoundPage />;
  return (
    <div className={`${pageStyles.page} ${styles.accessPage}`}>
      <h1>{t('sandbox.accessTitle')}</h1>
      <p>{t('sandbox.keepOpen')}</p>
      <QueryState query={payment}>
        {(config) =>
          config.available && config.environment === 'sandbox' ? (
            <SandboxBuyer config={config} standalone />
          ) : (
            <p>{t('sandbox.unavailable')}</p>
          )
        }
      </QueryState>
    </div>
  );
}
