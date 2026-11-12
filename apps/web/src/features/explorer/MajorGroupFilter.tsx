import type { UnitGroupSummary } from '@rewire/contracts';

import pageStyles from '../../app/Page.module.css';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './ExplorerPage.module.css';

export interface MajorGroup {
  readonly code: string;
  readonly title: string;
}

/** The major groups present in the list, in code order. */
export function majorGroupsOf(unitGroups: readonly UnitGroupSummary[]): readonly MajorGroup[] {
  const byCode = new Map(unitGroups.map((group) => [group.majorGroup.code, group.majorGroup]));
  return [...byCode.values()].sort((left, right) => left.code.localeCompare(right.code));
}

interface MajorGroupFilterProps {
  readonly groups: readonly MajorGroup[];
  readonly hidden: ReadonlySet<string>;
  readonly onChange: (hidden: ReadonlySet<string>) => void;
}

/** One checkbox per major group; a cleared box hides its occupations. */
export function MajorGroupFilter({ groups, hidden, onChange }: MajorGroupFilterProps) {
  const { t } = useMessages();
  const toggle = (code: string) => {
    const next = new Set(hidden);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    onChange(next);
  };
  return (
    <fieldset className={styles.groups}>
      <legend className={pageStyles.eyebrow}>{t('explore.majorGroups')}</legend>
      <div className={styles.groupList}>
        {groups.map((group) => (
          <label key={group.code}>
            <input
              type="checkbox"
              checked={!hidden.has(group.code)}
              onChange={() => {
                toggle(group.code);
              }}
            />
            {group.title}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
