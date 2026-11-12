import { Link } from 'react-router';

import { useMessages } from '../../i18n/use-messages.ts';

interface GuidePrivacyProps {
  readonly className?: string | undefined;
}

/** The small link under a field a person writes to the model in: the whole story is on /privacy. */
export function GuidePrivacy({ className }: GuidePrivacyProps) {
  const { t } = useMessages();
  return (
    <p className={className}>
      <Link to="/privacy">{t('privacy.link')}</Link>
    </p>
  );
}
