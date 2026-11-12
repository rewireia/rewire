import { regionSchema, type Region } from '@rewire/contracts';

import { updatePreferences, usePreferences } from '../app/preferences.ts';
import { useMessages } from '../i18n/use-messages.ts';

import { Capsule } from './Capsule.tsx';

/**
 * Where the person works, which sets the classification their job title is looked up in: EU, US
 * and UK on screen, with the full names kept for assistive technology.
 */
export function RegionSwitch({ fill = false }: { readonly fill?: boolean }) {
  const { t } = useMessages();
  const { region } = usePreferences();
  return (
    <Capsule<Region>
      legend={t('region.short')}
      fill={fill}
      options={regionSchema.options.map((value) => ({
        value,
        label: value.toUpperCase(),
        name: t(`region.${value}`),
      }))}
      value={region}
      onChange={(next) => {
        updatePreferences({ region: next });
      }}
    />
  );
}
