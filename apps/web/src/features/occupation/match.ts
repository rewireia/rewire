import type { OccupationDetail, UnitGroupLink } from '@rewire/contracts';

/** Every international group an occupation can be read through, strongest first. */
export function linksOf(detail: Pick<OccupationDetail, 'unitGroup' | 'alternatives'>) {
  const links: readonly UnitGroupLink[] =
    detail.unitGroup === null ? detail.alternatives : [detail.unitGroup, ...detail.alternatives];
  return links;
}
